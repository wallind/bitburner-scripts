import { NS, Server } from '/definitions/Bitburner'
import { Action, CurrentNetworkProjection, Worker } from '/definitions/network/NetworkManagerService'
import { calculateServerGrowth } from '/lib/targeting/growth'

/**
 * 
 * @param ns The Bitburner namespace Object
 * @param allHackableServers All servers in the network that we can hack
 * @param currentWorkers 
 * @returns 
 */
export const generateNetworkProjection = (ns: NS, allHackableServers: Server[], currentWorkers: Worker[]): CurrentNetworkProjection => {
	return {
		projections: allHackableServers.map(server => {
			const allWorkersTargetingServer = currentWorkers.filter(worker => worker.target === server.hostname)

			// calculate how much security this server will have after all assigned growers and hackers finish
			const securityDifferentialIncrease = allWorkersTargetingServer.reduce((acc, worker) => {
				switch (worker.action) {
					case Action.HACK:
						return acc + ns.hackAnalyzeSecurity(worker.threads, worker.target)
					case Action.GROW:
						return acc + ns.growthAnalyzeSecurity(worker.threads, worker.target)
					case Action.WEAKEN:
					default:
						return acc
				}
			}, 0)

			// calculate how much security decrease will occur once assigned weakeners finish
			const levelDecrease = allWorkersTargetingServer.reduce((acc, worker) => {
				switch (worker.action) {
					case Action.WEAKEN:
						return acc + ns.weakenAnalyze(worker.threads)
					case Action.GROW:
					case Action.HACK:
					default:
						return acc
				}
			}, 0)

			// calculate how much wealth this server will have after all assigned growers finish
			const player = ns.getPlayer()
			const wealthProportionIncrease = allWorkersTargetingServer.reduce((acc, worker) => {
				switch (worker.action) {
					case Action.GROW:
						return acc + calculateServerGrowth(server, worker.threads, player, worker.cores)
					case Action.HACK:
					case Action.WEAKEN:
					default:
						return 0
				}
			}, 0)

			return {
				hostname: server.hostname,
				security: {
					level: ns.getServerSecurityLevel(server.hostname) - levelDecrease,
					differential:
						ns.getServerSecurityLevel(server.hostname)
						-
						ns.getServerMinSecurityLevel(server.hostname)
						+
						securityDifferentialIncrease,
				},
				wealthProportion:
					(
						server.moneyAvailable
						/
						server.moneyMax
					)
					+
					wealthProportionIncrease
			}
		})
	}
}
