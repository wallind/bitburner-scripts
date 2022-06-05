import { NS } from '/definitions/Bitburner'
import { Hostname } from '/definitions/Network'
import { ScriptName } from '/definitions/Scripts'

/**
 * TODO:
 */
export async function main(ns: NS) {
	ns.exec(ScriptName.INFRA_AUTO_UPGRADER, Hostname.HOME, 1)
	ns.exec(ScriptName.NETWORK_MANAGER, Hostname.HOME, 1)
}
