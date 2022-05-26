/** @param {import(".").NS} ns */
export async function main(ns) {
	const firstArg = ns.args[0]
	let targetServers
	let forceMode
	const HACK_SCRIPT = "hack.js"
	const GROWER_SCRIPT = "grower.js"
	const WEAKENER_SCRIPT = "weakener.js"
	// allow forcing the whole network to grow/weaken for non hackerman servers
	const GROW_MODE = "GROW"
	const WEAKEN_MODE = "WEAKEN"

	const spreadToServer = async (server, scriptToUse) => {
		await ns.scp(scriptToUse, server)

		let openPorts = 0
		if (ns.fileExists("BruteSSH.exe")) {
			ns.brutessh(server)
			openPorts++
		}
		if (ns.fileExists("FTPCrack.exe")) {
			ns.ftpcrack(server)
			openPorts++
		}
		if (ns.fileExists("RelaySMTP.exe")) {
			ns.relaysmtp(server)
			openPorts++
		}
		if (ns.fileExists("HTTPWorm.exe")) {
			ns.httpworm(server)
			openPorts++
		}
		if (ns.fileExists("SQLInject.exe")) {
			ns.sqlinject(server)
			openPorts++
		}
		if (ns.getServerNumPortsRequired(server) <= openPorts) {
			ns.nuke(server)
			// await ns.installBackdoor()
		} else {
			return
		}

		// calculate available and maximize thread usage
		const ramAvailable = ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
		const ramPerThread = ns.getScriptRam(scriptToUse)
		const maxThreads = Math.floor(ramAvailable / ramPerThread)
		if (maxThreads > 0) {
			ns.exec(scriptToUse, server, maxThreads, ...targetServers.filter(server => ns.hasRootAccess(server)))
		}
	}

	if (firstArg === GROW_MODE || firstArg === WEAKEN_MODE) {
		forceMode = firstArg
		targetServers = ns.args.slice(1)
	} else {
		targetServers = ns.args

		let strongestServer = targetServers
			.sort((serverA, serverB) =>
				ns.getServerMaxRam(serverB) - ns.getServerMaxRam(serverA))
			.filter(server => ns.hasRootAccess(server))[0]

		// TODO: fix temp hack needed for first boot
		if (!strongestServer) {
			strongestServer = targetServers[0]
		}

		await spreadToServer(strongestServer, HACK_SCRIPT)

		targetServers = targetServers.filter(server => server !== strongestServer)
	}

	for (let i = 0; i < targetServers.length; i++) {
		let scriptToUse

		if (forceMode === GROW_MODE) {
			scriptToUse = GROWER_SCRIPT
		} else if (forceMode === WEAKEN_MODE) {
			scriptToUse = WEAKENER_SCRIPT
		} else if (i % 5 === 0) {
			scriptToUse = WEAKENER_SCRIPT
		} else {
			scriptToUse = GROWER_SCRIPT
		}

		await spreadToServer(targetServers[i], scriptToUse)
	}
}
