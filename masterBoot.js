/** @param {import(".").NS} ns */
export async function main(ns) {
	ns.disableLog("getServerRequiredHackingLevel")
	ns.disableLog("getHackingLevel")

	const HOME = "home"
	const depth = 20

	// allow forcing the whole network to grow/weaken for non hackerman servers
	let forceMode
	let firstArg = ns.args[0]
	if (firstArg === "GROW" || firstArg === "WEAKEN") {
		forceMode = firstArg
	}

	let observedServers = []

	const recursiveSearch = (scanRoot, fullPath, cycle = 0) => {
		if (cycle === depth) {
			return
		}

		// TODO:
		// if (scanRoot === "The-Cave") {
		// 	ns.tprint("Found The Cave")
		// 	ns.tprint(fullPath)
		// 	throw "END IT"
		// }

		// if (scanRoot === "The-Cave") {
		// 	ns.tprint("Found The Cave")
		// 	ns.tprint(fullPath)
		// 	throw "END IT"
		// }


		// scan from the root input
		const currentlyObservedServers = ns.scan(scanRoot)

		// any servers observed not already in the list get added
		const newlyObservedServers = currentlyObservedServers
			.filter(server => !observedServers.includes(server))
		observedServers = observedServers.concat(newlyObservedServers)

		// recursively traverse
		for (const newServer of newlyObservedServers) {
			recursiveSearch(newServer, fullPath + "/" + newServer, cycle + 1)
		}
	}

	recursiveSearch(HOME, HOME)

	// these can be passed to spreader to ei
	const validHackNodeTargets = observedServers = observedServers
		// filter out servers we dont have the level for from attack vector
		.filter(server => ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel())

		// drop "home"
		.filter(server => server !== "home")

		// filter out hackerman* servers
		// TODO: be a real programmer and use REGEX
		.filter(server => !server.includes("hackerman"))
	const rootAccessObtainedTargets = validHackNodeTargets
		// these targets
		.filter(server => ns.hasRootAccess(server))

	const totalAvailableRam = ns.getServerMaxRam(HOME)
	const SPREADER_SCRIPT = "spreader.js"
	const DEPLOY_HACKERMAN_NET_SCRIPT = "deployHackermanNet.js"
	const INFRA_AUTO_UPGRADER_SCRIPT = "infraAutoUpgrader.js"
	const GROWER_SCRIPT = "grower.js"
	const WEAKENER_SCRIPT = "weakener.js"

	const ramForGrowersAndWeakeners = totalAvailableRam
		- ns.getScriptRam(SPREADER_SCRIPT)
		- ns.getScriptRam(DEPLOY_HACKERMAN_NET_SCRIPT)
		- ns.getScriptRam(INFRA_AUTO_UPGRADER_SCRIPT)

	const spreaderJsArgs = forceMode ?
		[forceMode, ...validHackNodeTargets]
		:
		validHackNodeTargets

	ns.exec(SPREADER_SCRIPT, HOME, 1, ...spreaderJsArgs)
	ns.exec(DEPLOY_HACKERMAN_NET_SCRIPT, HOME, 1, ...rootAccessObtainedTargets)
	ns.exec(INFRA_AUTO_UPGRADER_SCRIPT, HOME, 1)

	const maxThreadsForMaintainers = Math.floor(Math.floor(ramForGrowersAndWeakeners / ns.getScriptRam(GROWER_SCRIPT)) / 2) - 1

	// deploy weaken and grow maintenance workers
	ns.exec(GROWER_SCRIPT, HOME, maxThreadsForMaintainers, ...rootAccessObtainedTargets)
	ns.exec(WEAKENER_SCRIPT, HOME, maxThreadsForMaintainers, ...rootAccessObtainedTargets)
}
