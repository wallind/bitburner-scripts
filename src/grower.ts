import { NS } from '/definitions/Bitburner'
import { isStringArray } from '/lib/validation/basic'

interface GrowTarget {
	server: string
	max: number
	available: number
	proportion: number
	securityMultiplier: number
	runtimeMs: number

	// lower candidate score means more desirable
	candidateScore: number
}

export async function main(ns: NS) {
	const SECURITY_HOT_THRESHOLD = 11
	ns.disableLog("getServerMaxMoney")
	ns.disableLog("getServerMoneyAvailable")
	ns.disableLog("getServerMinSecurityLevel")
	ns.disableLog("getServerSecurityLevel")

	let growTargetList: string[]

	// TODO: make this better
	if (!isStringArray(ns.args)) {
		ns.print(`INVALID`)
		throw new Error(`Invalid target list via args`)
	} else {
		growTargetList = ns.args as string[]
	}

	let currentGrowTarget: GrowTarget | undefined

	const securityScreen = () => {
		if (!currentGrowTarget) {
			return
		}

		const currentGrowTargetCurrentSecurity = ns.getServerSecurityLevel(currentGrowTarget.server)
		const currentGrowTargetMinSecurity = ns.getServerMinSecurityLevel(currentGrowTarget.server)

		if (currentGrowTargetCurrentSecurity - currentGrowTargetMinSecurity > SECURITY_HOT_THRESHOLD) {
			ns.print(`CURRENT GROWING TARGET ${currentGrowTarget.server} TOO HOT; falling back`)
			currentGrowTarget = undefined
		}
	}

	const processGrowerTarget = (candidateGrowTarget: string): GrowTarget | undefined => {
		const candidateGrowTargetMoneyAvailable = ns.getServerMoneyAvailable(candidateGrowTarget)
		const candidateGrowTargetMaxMoney = ns.getServerMaxMoney(candidateGrowTarget)
		const candidateGrowTargetWealthProportion =
			candidateGrowTargetMoneyAvailable
			/
			candidateGrowTargetMaxMoney
		const candidateGrowTargetServerMinSecurityLevel = ns.getServerMinSecurityLevel(candidateGrowTarget)
		const candidateGrowTargetServerSecurityLevel = ns.getServerSecurityLevel(candidateGrowTarget)
		const candidateGrowTargetServerSecurityMultiplier =
			candidateGrowTargetServerSecurityLevel - candidateGrowTargetServerMinSecurityLevel
		const candidateGrowTargetRuntimeMs = ns.getGrowTime(candidateGrowTarget)

		if (candidateGrowTargetMoneyAvailable <= 0 || candidateGrowTargetMaxMoney <= 0) {
			return undefined
		}

		return {
			server: candidateGrowTarget,
			max: candidateGrowTargetMaxMoney,
			available: candidateGrowTargetMoneyAvailable,
			proportion: candidateGrowTargetWealthProportion,
			securityMultiplier: candidateGrowTargetServerSecurityMultiplier,
			runtimeMs: candidateGrowTargetRuntimeMs,

			// lower candidate score means more desirable
			candidateScore:
				// lower wealth proportion means needs help getting lifted up
				candidateGrowTargetWealthProportion
				// higher security presence decreases desirability
				* (candidateGrowTargetServerSecurityMultiplier || 1)
				// the longer the grow time is the less desirable this target should be
				// * candidateGrowTargetRuntimeMs / 60000 // minutes
				// apply a slight preference for current rich targets
				* 1 / (candidateGrowTargetMoneyAvailable > 1000000 ? 4 : 1)

				// strongly prefer ultra-rich targets
				* 1 / (candidateGrowTargetMaxMoney / 10000000)
		}
	}

	const selectNewBestTarget = async () => {
		const candidates = growTargetList
			.map(target => processGrowerTarget(target))
			.filter(target => target)
			.map(target => target as GrowTarget)
			.filter(target => target.server !== (currentGrowTarget && currentGrowTarget.server || "LOLOLOLOLOL🕺"))
			.filter(target => target.securityMultiplier < SECURITY_HOT_THRESHOLD)

		if (candidates.length <= 0) {
			ns.print(`⚠ WARNING ⚠; sleeping for 15s as all grow targets have > 18 security_differential`)
			await ns.sleep(15000)
			currentGrowTarget = undefined
			return
		}

		for (const candidateGrowTarget of candidates) {
			if (!currentGrowTarget || candidateGrowTarget.candidateScore < currentGrowTarget.candidateScore) {
				ns.print(
					`SWITCHING_GROW_TARGET from: \n`
					+ (
						currentGrowTarget ?
							`\tFROM: ${currentGrowTarget.server}\n`
							+ `\t\tCURRENT_MONEY/MAX_MONEY: ${ns.nFormat(currentGrowTarget.available, '($0.00a)')}/${ns.nFormat(currentGrowTarget.max, '($0.00a)')}\n`
							+ `\t\tPROPORTIONAL_WEALTH: ${ns.nFormat(currentGrowTarget.proportion, '0.000%')}\n`
							+ `\t\tSECURITY_DIFFERENTIAL: ${ns.nFormat(currentGrowTarget.securityMultiplier, '0.00')}\n`
							+ `\t\tRUNTIME_MS: ${ns.nFormat(currentGrowTarget.runtimeMs, '0.00')}\n`
							+ `\t\tCANDIDATE_SCORE: ${ns.nFormat(currentGrowTarget.candidateScore, '0.00000')}\n`
							:
							'\tFROM: N/A - NO_CURRENT_TARGET'
					)
					+ `\tTO: ${candidateGrowTarget.server}\n`
					+ `\t\tCURRENT_MONEY/MAX_MONEY: ${ns.nFormat(candidateGrowTarget.available, '($0.00a)')}/${ns.nFormat(candidateGrowTarget.max, '($0.00a)')}\n`
					+ `\t\tPROPORTIONAL_WEALTH: ${ns.nFormat(candidateGrowTarget.proportion, '0.000%')}\n`
					+ `\t\tSECURITY_DIFFERENTIAL: ${ns.nFormat(candidateGrowTarget.securityMultiplier, '0.00')}\n`
					+ `\t\tRUNTIME_MS: ${ns.nFormat(candidateGrowTarget.runtimeMs, '0.00')}\n`
					+ `\t\tCANDIDATE_SCORE: ${ns.nFormat(candidateGrowTarget.candidateScore, '0.00000')}\n`

				)
				currentGrowTarget = candidateGrowTarget
				break
			}
		}
	}

	currentGrowTarget = processGrowerTarget(growTargetList.find(target => processGrowerTarget(target)) as string)

	while (true) {
		securityScreen()
		await selectNewBestTarget()

		if (currentGrowTarget) {
			await ns.grow(currentGrowTarget.server)
		} else {
			ns.print(`WARNING; no valid GROW target (probably too much security); sleeping`)
			await ns.sleep(15000)
		}

		await ns.sleep(1)
	}
}
