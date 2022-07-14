import { NS, Server } from '/definitions/Bitburner'
import { Hostname } from '/definitions/network/Network'
import { HostnameDetail } from '/definitions/network/NetworkManagerService'

/**
 * Attempt to breach a server in totality by executing all possible hack files
 * and then if enough ports are opened executing nuke and backdoor if hacking 
 * level permits.
 * 
 * @param ns Bitburner namespace
 * @param targetServer Server to attempt breaching
 * @param targetHostnameFullPath Full path to the target server with root /home
 */
export const attemptServerBreach = async (ns: NS, targetServer: Server, targetHostnameFullPath: string) => {
	if (!targetServer.hasAdminRights) {
		let openPorts = 0

		if (targetServer.sshPortOpen) {
			openPorts++
		} else if (ns.fileExists("BruteSSH.exe")) {
			ns.brutessh(targetServer.hostname)
			openPorts++
		}

		if (targetServer.ftpPortOpen) {
			openPorts++
		} else if (ns.fileExists("FTPCrack.exe")) {
			ns.ftpcrack(targetServer.hostname)
			openPorts++
		}

		if (targetServer.smtpPortOpen) {
			openPorts++
		} else if (ns.fileExists("RelaySMTP.exe")) {
			ns.relaysmtp(targetServer.hostname)
			openPorts++
		}

		if (targetServer.httpPortOpen) {
			openPorts++
		} else if (ns.fileExists("HTTPWorm.exe")) {
			ns.httpworm(targetServer.hostname)
			openPorts++
		}

		if (targetServer.sqlPortOpen) {
			openPorts++
		} else if (ns.fileExists("SQLInject.exe")) {
			ns.sqlinject(targetServer.hostname)
			openPorts++
		}

		if (targetServer.numOpenPortsRequired <= openPorts) {
			ns.tprint(`gaining rootAccess for ${targetServer.hostname}`)
			ns.killall(targetServer.hostname)
			ns.nuke(targetServer.hostname)
			ns.tprint(`rootAccess obtained for ${targetServer.hostname} using NUKE.exe`)
		}
	}

	if (
		targetServer.hasAdminRights
		&& !targetServer.backdoorInstalled
		&& ns.getHackingLevel() >= targetServer.requiredHackingSkill
	) {
		ns.tprint(`installing backdoor for ${targetServer.hostname}`)

		// capture current server so we can return the player to it after hopping around the network
		const currentPlayerServer = ns.singularity.getCurrentServer()

		// navigate the full path to the target server starting at home
		const steppingStones = targetHostnameFullPath.split("/").slice(1)
		ns.singularity.connect(Hostname.HOME)
		steppingStones.forEach(steppingStoneHostname => ns.singularity.connect(steppingStoneHostname))

		await ns.singularity.installBackdoor()
		ns.tprint(`backdoor installed for ${targetServer.hostname}`)

		// return the player to the current server
		ns.singularity.connect(currentPlayerServer)
	}
}

/**
 * Build a list of all server hostnames and the path to get to them
 * 
 * @param ns Bitburner namespace
 * @returns List of all server hostnames with the fullpath of their location
 */
export const recursivelyBuildHostnameList = (ns: NS): HostnameDetail[] => {
	const aggregateHostnameDetails: HostnameDetail[] = []

	const recursiveTraversal = (scanRoot: string, scanRootFullPath: string) => {
		aggregateHostnameDetails.push({
			hostname: scanRoot,
			fullPath: scanRootFullPath,
		})

		// scan from the root input
		const hostnamesConnectedToScanRoot = ns.scan(scanRoot)
		const newlyObservedHostnames = hostnamesConnectedToScanRoot
			.filter(hostnameConnectedToScanRoot => !aggregateHostnameDetails.find(observedHostname => hostnameConnectedToScanRoot === observedHostname.hostname))

		// recursively traverse
		for (const newHostname of newlyObservedHostnames) {
			recursiveTraversal(newHostname, `${scanRootFullPath}/${newHostname}`)
		}
	}

	// build a list of every server
	recursiveTraversal(Hostname.HOME, `/${Hostname.HOME}`)

	return aggregateHostnameDetails
}

/**
 * Generate a unique id
 * 
 * Reference: https://stackoverflow.com/a/19842865/8876886
 */
export const generateId = () => Math.random().toString(16).slice(2)
