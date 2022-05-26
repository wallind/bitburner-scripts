/** @param {import(".").NS} ns */
export async function main(ns) {
	const myMoney = () => ns.getServerMoneyAvailable("home")

	ns.disableLog("getServerMoneyAvailable")
	ns.disableLog("sleep")

	const getCheapestLevelUpgrade = () => {
		let cheapestLevelUpgradeTarget = null

		for (let i = 0; i < ns.hacknet.numNodes(); i++) {
			const candidateLevelUpgradeCost = ns.hacknet.getLevelUpgradeCost(i, 1)

			if (!cheapestLevelUpgradeTarget || candidateLevelUpgradeCost < cheapestLevelUpgradeTarget.cost) {
				cheapestLevelUpgradeTarget = {
					cost: candidateLevelUpgradeCost,
					type: 'level',
					nodeIndex: i,
				}
			}
		}

		return cheapestLevelUpgradeTarget
	}
	const getCheapestCoreUpgrade = () => {
		let cheapestCoreUpgradeTarget = null

		for (let i = 0; i < ns.hacknet.numNodes(); i++) {
			const candidateCoreUpgradeCost = ns.hacknet.getCoreUpgradeCost(i, 1)

			if (!cheapestCoreUpgradeTarget || candidateCoreUpgradeCost < cheapestCoreUpgradeTarget.cost) {
				cheapestCoreUpgradeTarget = {
					cost: candidateCoreUpgradeCost,
					type: 'core',
					nodeIndex: i,
				}
			}
		}

		return cheapestCoreUpgradeTarget
	}
	const getCheapestHackermanNetPurchase = () => {
		const numPurchasedServers = ns.getPurchasedServers()

		if (numPurchasedServers.length >= 25) {
			return null
		}

		// slow ramp up to get hackerman* net up and running sooner
		let desiredRam = 8
		if (numPurchasedServers.length > 16) {
			desiredRam = 64
		} else if (numPurchasedServers.length > 4) {
			desiredRam = 16
		}

		return {
			cost: ns.getPurchasedServerCost(desiredRam),
			type: 'hackerman-purchase',
			nodeIndex: null,
			desiredRam
		}
	}

	const waitForMoney = async (cheapestUpgrade) => {
		while (myMoney() < cheapestUpgrade.cost) {
			// ns.print(`waiting 5sec for ${JSON.stringify(cheapestUpgrade)}; current_money: ${ns.nFormat(myMoney(), '($ 0.00 a)')}`)
			await ns.sleep(5000)
		}
	}

	const getCheapestRamUpgrade = () => {
		let cheapestRamUpgradeTarget = null

		for (let i = 0; i < ns.hacknet.numNodes(); i++) {
			const candidateRamUpgradeCost = ns.hacknet.getRamUpgradeCost(i, 1)

			if (!cheapestRamUpgradeTarget || candidateRamUpgradeCost < cheapestRamUpgradeTarget.cost) {
				cheapestRamUpgradeTarget = {
					cost: candidateRamUpgradeCost,
					type: 'ram',
					nodeIndex: i,
				}
			}
		}

		return cheapestRamUpgradeTarget
	}

	while (true) {
		// {
		// 	cost: number,
		// 	type: string, 'ram' | 'core' | 'level' | 'node-purchase' | 'hackerman-purchase',
		// 	nodeIndex: number,
		//  desiredRam?: number
		// }
		const cheapestUpgrade = [
			getCheapestRamUpgrade(),
			getCheapestCoreUpgrade(),
			getCheapestLevelUpgrade(),
			getCheapestHackermanNetPurchase(),
			{
				cost: ns.hacknet.getPurchaseNodeCost(),
				type: 'node-purchase',
				nodeIndex: null
			}
		]
			.filter(upgrade => upgrade)
			// sort the cheapest to the end
			.sort((upgradeA, upgradeB) => {
				const adjustedCost = (upgrade) => {
					switch (upgrade.type) {
						case 'core':
							// cores should be slightly weighted after initial levels
							if (upgrade.cost > 1000000) {
								return upgrade.cost * 0.55
							} else if (upgrade.cost > 500000) {
								return upgrade.cost * 0.65
							} else if (upgrade.cost > 75000) {
								return upgrade.cost * 0.75
							} else {
								return upgrade.cost
							}
						case 'ram':
							// this will cause RAM to be upgrade more often which will generally
							// accelerate the hacknet development
							if (upgrade.cost > 2000000) {
								return upgrade.cost * .22
							} else if (upgrade.cost > 1000000) {
								return upgrade.cost * .25
							} else if (upgrade.cost > 100000) {
								return upgrade.cost * 0.5
							} else if (upgrade.cost > 50000) {
								return upgrade.cost * 0.75
							} else {
								return upgrade.cost * 0.85
							}
						case 'level':
							// de-prioritize levels over time as their returns diminish fast
							if (upgrade.cost > 100000) {
								return upgrade.cost * 3.00
							} else if (upgrade.cost > 50000) {
								return upgrade.cost * 2.50
							} else if (upgrade.cost > 25000) {
								return upgrade.cost * 2.05 // .05 to be more expensive than hackerman 'first 4'
							} else {
								return upgrade.cost
							}
						case 'node-purchase':
							// purchasing new nodes should not necessarily look ultra appealing as 
							// it can cause slowdown in early phase by exacerbating cycles
							if (upgrade.cost > 1000000) {
								return upgrade.cost * 1.25
							} else {
								return upgrade.cost * 1.75
							}
						case 'hackerman-purchase':
							// slightly prioritize hackerman* net always
							if (ns.getPurchasedServers().length < 4) {
								return 50000
							} else {
								return upgrade.cost * 0.75
							}
						default:
							throw "UNEXPECTED"
					}
				}

				return adjustedCost(upgradeB) - adjustedCost(upgradeA)
			})
			.pop()

		ns.print(`next upgrade is ${JSON.stringify(cheapestUpgrade)}`)

		await waitForMoney(cheapestUpgrade)

		switch (cheapestUpgrade.type) {
			case 'core':
				ns.hacknet.upgradeCore(cheapestUpgrade.nodeIndex, 1)
				break
			case 'ram':
				ns.hacknet.upgradeRam(cheapestUpgrade.nodeIndex, 1)
				break
			case 'level':
				ns.hacknet.upgradeLevel(cheapestUpgrade.nodeIndex, 1)
				break
			case 'node-purchase':
				ns.hacknet.purchaseNode()
				break
			case 'hackerman-purchase':
				const hackermanServers = ns.scan("home")
					.filter(server => server.includes("hackerman"))
				const nextAvailableName = () => {
					let i = 0

					while (hackermanServers.includes(`hackerman${i}`)) {
						i++
					}

					return `hackerman${i}`
				}
				ns.purchaseServer(nextAvailableName(), cheapestUpgrade.desiredRam)
				break
			default:
				throw "UNEXEPCTED"
		}

		await ns.sleep(1)
	}
}
