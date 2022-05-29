/** @param {import(".").NS} ns */
export async function main(ns) {
	// ns.disableLog("getServerMinSecurityLevel")
	// ns.disableLog("getServerSecurityLevel")

	const targetList = ns.args

	while (true) {
		for (const server of targetList) {
			// ns.getWeakenTime(server)
			const serverMinSecurityLevel = ns.getServerMinSecurityLevel(server)
			const serverSecurityLevel = ns.getServerSecurityLevel(server)
			const securityThresh = serverMinSecurityLevel + 4
			// const startMs = Date.now()

			// ns.print(
			// 	`WEAKEN executing against target ${server}.\n`
			// 	+ `\tCURRENT_TIME: ${ns.tFormat(startMs)}`
			// 	+ `\DURATION_ESTIMATE:` ${ns.tFormat(ns.getWeakenTime(server))}
			// )

			if (serverSecurityLevel > securityThresh) {
				await ns.weaken(server)
			}
		}

		await ns.sleep(1)
	}
}
