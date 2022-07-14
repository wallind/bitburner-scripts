import { NS } from '/definitions/Bitburner'
import { Hostname } from '/definitions/network/Network'
import { ScriptPath } from '/definitions/Scripts'

/**
 * The script we run from inside BitBurner to activate this crazy Rube Goldberg machine.
 */
export async function main(ns: NS) {
	ns.exec(ScriptPath.INFRA_AUTO_UPGRADER_SERVICE, Hostname.HOME, 1)
	ns.exec(ScriptPath.FACTION_MANAGER_SERVICE, Hostname.HOME, 1)
	ns.exec(ScriptPath.NETWORK_MANGER_SERVICE, Hostname.HOME, 1)
}
