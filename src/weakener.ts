import { NS } from '/definitions/Bitburner'
import { isStringArray } from '/lib/validation/basic'

/**
 * TODO:
 * 
 * @param ns 
 */
export async function main(ns: NS) {
	let targetList: string[]

	// TODO: make this better
	if (!isStringArray(ns.args)) {
		ns.print(`INVALID`)
		throw new Error(`Invalid target list via args`)
	} else {
		targetList = ns.args as string[]
	}

	while (true) {
		for (const server of targetList) {
			const serverMinSecurityLevel = ns.getServerMinSecurityLevel(server)
			const serverSecurityLevel = ns.getServerSecurityLevel(server)
			const securityThresh = serverMinSecurityLevel + 4

			if (serverSecurityLevel > securityThresh) {
				await ns.weaken(server)
			}
		}

		await ns.sleep(1)
	}
}
