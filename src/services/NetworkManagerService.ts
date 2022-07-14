import { NS, Server } from '/definitions/Bitburner'
import { Hostname } from '/definitions/network/Network'
import { HostnameDetail } from '/definitions/network/NetworkManagerService'
import { ScriptPath } from '/definitions/Scripts'
import { attemptServerBreach, recursivelyBuildHostnameList } from '/lib/utils'

export async function main(ns: NS) {
	let serversWithRootAccess: Server[] = []
	let hackTargetServers: Server[] = []
	let growAndWeakenTargetServers: Server[] = []
	// let currentWorkers: Worker[] = []
	let allHostnameDetails: HostnameDetail[] = []
	// let currentProjection: CurrentNetworkProjection = generateNetworkProjection(ns, hackableServers, currentWorkers)

	// const assignServerTask = (server: Server) => {

	// }

	const spread = async (rootAccessHostnames: string[]) => {
		/**
		 * Copies the provided script and the entire lib directory to the target server and then
		 * executes the script with the provided arguments.
		 * 
		 * @param hostname The hostname of the server to copy+execute the script on
		 * @param scriptToUse The script to copy+execute
		 * @param args The arguments to pass to the script
		 */
		const execOnServer = async (hostname: string, scriptToUse: ScriptPath, args: string[]) => {
			await ns.scp(scriptToUse, hostname)
			const libFiles = ns.ls(Hostname.HOME, "lib")
			await ns.scp(libFiles, hostname)

			// calculate available and maximize thread usage
			const ramAvailable = ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname)
			const ramPerThread = ns.getScriptRam(scriptToUse)
			const maxThreads = Math.floor(ramAvailable / ramPerThread)
			if (maxThreads > 0) {
				ns.exec(scriptToUse, hostname, maxThreads, ...args)
			}
		}

		let strongestServerHostname: string =
			// just so happens the pool of targets for grow/weaken (server with root access that aren't in hackernet) happens to be
			// the pool of candidates for our hacker server
			[...growAndWeakenTargetServers.map(server => server.hostname)]
				// sort strongest -> weakest
				.sort((serverHostnameA, serverHostnameB) =>
					ns.getServerMaxRam(serverHostnameB) - ns.getServerMaxRam(serverHostnameA))
			// take the first(strongest)
			[0] // ignore the haters who say "what if there are no servers"


		await execOnServer(strongestServerHostname, ScriptPath.HACK, hackTargetServers.map(server => server.hostname))

		// avoid re-using the 'hack' server
		rootAccessHostnames = rootAccessHostnames.filter(hostname => hostname !== strongestServerHostname)

		// deploy scripts to the rest of the servers
		for (let i = 0; i < rootAccessHostnames.length; i++) {
			let scriptToUse: ScriptPath

			// 2:1 GROWER:WEAKENER (save for first 4 are to be growers)
			// W -> G -> G -> W -> G -> G-> etc..
			if (i > 3 && i % 3 === 0) {
				scriptToUse = ScriptPath.WEAKENER
			} else {
				scriptToUse = ScriptPath.GROWER
			}

			await execOnServer(rootAccessHostnames[i], scriptToUse, growAndWeakenTargetServers.map(server => server.hostname))
		}
	}

	/**
	 * Refresh the manager's information about the network in the process breaching any servers
	 * that we have the ability to but haven't yet.
	 * 
	 * Information gathered:
	 * - servers we have root access for
	 * - servers we can--and want to-- hack
	 * - servers we can--and want to-- grow and weaken
	 * TODO: network projection details
	 */
	const refreshNetworkInfo = async () => {
		ns.print(`Refreshing network info...`)

		allHostnameDetails = recursivelyBuildHostnameList(ns)
		const aggregateServers = allHostnameDetails
			.map(hostnameDetail => ns.getServer(hostnameDetail.hostname))
		for (const server of aggregateServers) {
			await attemptServerBreach(ns, server, allHostnameDetails.find(hostnameDetail => hostnameDetail.hostname === server.hostname)?.fullPath!)
		}

		serversWithRootAccess = aggregateServers
			.filter(server => ns.hasRootAccess(server.hostname))
			// root access on "home" is implied and this list represents the rest of the distributed network
			.filter(server => server.hostname !== Hostname.HOME)
		// filter out *hackerman* servers from targeting pools
		const baseTargetPool: Server[] = serversWithRootAccess.filter(server => !(new RegExp(Hostname.HACKERMAN_BASE)).test(server.hostname))
		// any target we have root access on will be a valid grow/weaken target
		growAndWeakenTargetServers = baseTargetPool
		// for hacking filter out servers we dont have the hacking level for
		hackTargetServers = baseTargetPool.filter(server => ns.getServerRequiredHackingLevel(server.hostname) <= ns.getHackingLevel())

		// currentProjection = generateNetworkProjection(ns, hackableServers, currentWorkers)
	}

	/**
	 * Reboot the entire network which entails the following:
	 * - kill all deployed scripts
	 * - kill the grower+weakener worker combo on home
	 * - spread the hacker (singular) and growers and weakeners to the network
	 * - start back up the grower+weakener worker combo on home
	 */
	const reboot = async () => {
		ns.tprint(`Rebooting...`)
		// kill all running remote scripts so spread can re-deploy stuff with new network info
		serversWithRootAccess.forEach(server => ns.killall(server.hostname))
		// kill home maintainers so they can be re-deployed with new network info
		ns.scriptKill(ScriptPath.GROWER, Hostname.HOME)
		ns.scriptKill(ScriptPath.WEAKENER, Hostname.HOME)

		const rootAccessHostnames = serversWithRootAccess.map(server => server.hostname)

		// infect them all..
		await spread(rootAccessHostnames)

		// use what's left of the RAM on home for a grower+weakener split evenly
		const ramForGrowersAndWeakeners = ns.getServerMaxRam(Hostname.HOME)
			- ns.getScriptRam(ScriptPath.NETWORK_MANGER_SERVICE)
			- ns.getScriptRam(ScriptPath.INFRA_AUTO_UPGRADER_SERVICE)
			- ns.getScriptRam(ScriptPath.FACTION_MANAGER_SERVICE)
		const maxThreadsForMaintainers =
			Math.floor(
				Math.floor(
					ramForGrowersAndWeakeners
					/
					Math.max(ns.getScriptRam(ScriptPath.GROWER))
				)
				/
				2
			) - 1
		// deploy weaken and grow maintenance workers
		ns.exec(ScriptPath.GROWER, Hostname.HOME, maxThreadsForMaintainers, ...growAndWeakenTargetServers.map(server => server.hostname))
		ns.exec(ScriptPath.WEAKENER, Hostname.HOME, maxThreadsForMaintainers, ...growAndWeakenTargetServers.map(server => server.hostname))
	}

	while (true) {
		const previousRootAccessServers = [...serversWithRootAccess]
		const previousHackTargetServers = [...hackTargetServers]

		await refreshNetworkInfo()

		const newRootAccessServers = serversWithRootAccess
			.filter(server => !previousRootAccessServers.find(previousServer => previousServer.hostname === server.hostname))
		const newHackTargetServers = hackTargetServers
			.filter(server => !previousHackTargetServers.find(previousServer => previousServer.hostname === server.hostname))
		if (newRootAccessServers.length) {
			ns.tprint(
				`New server(s) with root access detected!\n`
				+ `\t${serversWithRootAccess.length - previousRootAccessServers.length} additional server(s) detected!\n`
				+ `\tNEW_SERVERS: ${newRootAccessServers.map(server => server.hostname).join(', ')}\n`
			)
			await reboot()
		} else if (newHackTargetServers.length) {
			ns.tprint(
				`New server(s) with hacking access detected!\n`
				+ `\t${hackTargetServers.length - previousHackTargetServers.length} additional server(s) detected!\n`
				+ `\tNEW_SERVERS: ${newHackTargetServers.map(server => server.hostname).join(', ')}\n`
			)
			await reboot()
		}

		await ns.sleep(5000)
	}
}
