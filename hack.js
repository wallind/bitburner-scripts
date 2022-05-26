/** @param {import(".").NS} ns */
export async function main(ns) {
	const SECURITY_HOT_THRESHOLD = 11
	ns.disableLog("getServerMoneyAvailable")
	ns.disableLog("getServerMaxMoney")
	ns.disableLog("getServerMinSecurityLevel")
	ns.disableLog("getServerSecurityLevel")

	const targetList = ns.args
	let currentTarget = ns.args.find(server => ns.getServerMoneyAvailable(server))

	const securityScreen = () => {
		if (!currentTarget) {
			return
		}

		const currentTargetCurrentSecurity = ns.getServerSecurityLevel(currentTarget)
		const currentTargetMinSecurity = ns.getServerSecurityLevel(currentTarget)

		if (currentTargetCurrentSecurity - currentTargetMinSecurity > SECURITY_HOT_THRESHOLD) {
			ns.print(`HACKING TARGET ${currentTarget} TOO HOT; falling back`)
			currentTarget = null
		}
	}

	const selectNewBestTarget = () => {
		for (const candidateTarget of targetList) {
			const currentTargetMoneyAvailable = ns.getServerMoneyAvailable(currentTarget)
			const currentTargetMaxMoney = ns.getServerMaxMoney(currentTarget)
			const currentTargetWealthProportion =
				currentTargetMoneyAvailable
				/
				currentTargetMaxMoney
			const currentTargetSecurityDifferential =
				ns.getServerSecurityLevel(currentTarget) - ns.getServerMinSecurityLevel(currentTarget)

			const candidateTargetMoneyAvailable = ns.getServerMoneyAvailable(candidateTarget)
			const candidateTargetMaxMoney = ns.getServerMaxMoney(candidateTarget)
			const candidateTargetWealthProportion =
				candidateTargetMoneyAvailable
				/
				candidateTargetMaxMoney
			const candidateTargetSecurityDifferential =
				ns.getServerSecurityLevel(candidateTarget) - ns.getServerMinSecurityLevel(candidateTarget)


			if (
				candidateTargetWealthProportion !== Infinity
				&& candidateTargetWealthProportion !== NaN
				&& candidateTargetWealthProportion > currentTargetWealthProportion
				&& candidateTargetSecurityDifferential < SECURITY_HOT_THRESHOLD
			) {
				ns.print(
					`SWITCHING_TARGET:\n`
					+ `\tFROM:\n`
					+ `\t\tSERVER: ${currentTarget}\n`
					+ `\t\tCURRENT_MONEY: ${ns.nFormat(currentTargetMoneyAvailable, "($0.00a)")}\n`
					+ `\t\tMAX_MONEY: ${ns.nFormat(currentTargetMaxMoney, "($0.00a)")}\n`
					+ `\t\tPROPORTIONAL_WEALTH: ${ns.nFormat(currentTargetWealthProportion, "0.000%")}\n`
					+ `\t\tSECURITY_DIFFERENTIAL: ${ns.nFormat(currentTargetSecurityDifferential, "0.000")}\n`
					+ `\tTO:\n`
					+ `\t\tSERVER: ${candidateTarget}\n`
					+ `\t\tCURRENT_MONEY: ${ns.nFormat(candidateTargetMoneyAvailable, "($0.00a)")}\n`
					+ `\t\tMAX_MONEY: ${ns.nFormat(candidateTargetMaxMoney, "($0.00a)")}\n`
					+ `\t\tPROPORTIONAL_WEALTH: ${ns.nFormat(candidateTargetWealthProportion, "0.000%")}\n`
					+ `\t\tSECURITY_DIFFERENTIAL: ${ns.nFormat(candidateTargetSecurityDifferential, "0.000")}\n`

				)

				currentTarget = candidateTarget
				return true
			}
		}
	}

	while (true) {
		securityScreen()
		selectNewBestTarget()

		if (currentTarget) {
			await ns.hack(currentTarget)
		} else {
			ns.print(`WARNING; no valid HACK target (probably too much security); sleeping`)
			await ns.sleep(15000)
		}

		await ns.sleep(1)
	}
}
