/** @param {NS} ns */
export async function main(ns) {
	const targetList = ns.args

	const weakenerScript = "weakener.js"
	const growerScript = "grower.js"

	const hackermanServers = ns.scan("home")
		.filter(server => server.includes("hackerman"))

	const calculateMaxThreads = (script, server) => {
		const ramAvailable = ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
		const ramPerThread = ns.getScriptRam(script)
		return Math.floor(ramAvailable / ramPerThread)
	}

	for (let i = 0; i < hackermanServers.length; i++) {
		const server = hackermanServers[i]

		// 2:1 GROWER:WEAKENER (save for first 4 are to be growers)
		// W -> G -> G -> W -> G -> G-> etc..
		if (i > 3 && i % 3 === 0) {
			// deploy 'weakeners'
			await ns.scp(weakenerScript, server)
			ns.exec(weakenerScript, server, calculateMaxThreads(weakenerScript, server), ...targetList)
		} else {
			// deploy 'growers'
			await ns.scp(growerScript, server)
			ns.exec(growerScript, server, calculateMaxThreads(growerScript, server), ...targetList)
		}
	}
}