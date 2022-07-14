import { NS } from '/definitions/Bitburner'
import { FactionAugmentation, FactionName } from '/definitions/faction/Faction'
import { MINUTE_MS } from '/lib/constants'

export async function main(ns: NS) {
	let factionInvitations: string[] = []
	let currentFactionEngagement: FactionName | undefined
	let ownedAugmentations: string[] = []
	const ALL_FACTION_NAMES = Object.values(FactionName)

	/**
	 * refresh the list of faction invitations
	 */
	const refreshFactionInvitations = () => {
		factionInvitations = ns.singularity.checkFactionInvitations()
	}

	/**
	 * refresh the in memory list of owned augmentations
	 */
	const refreshOwnedAugmentations = () => {
		ownedAugmentations = ns.singularity.getOwnedAugmentations()
	}

	/**
	 * Given a faction name, return whether we need more reputation for that faction
	 * to be able to buy all of its augmentations
	 * 
	 * @param faction the faction name to check
	 * @returns true if we need more reputation to buy all of the augmentations for the faction
	 * else false
	 */
	const furtherWorkNeededForFaction = (faction: FactionName) => {
		const factionAugmentations: FactionAugmentation[] = ns.singularity
			.getAugmentationsFromFaction(faction)
			.map(augmentationName => ({
				name: augmentationName,
				reputationRequirement: ns.singularity.getAugmentationRepReq(augmentationName),
				acquired: ownedAugmentations.includes(augmentationName)
			}))
			// TODO: deal with "NeuroFlux Governor" better
			.filter(augmentation => augmentation.name !== "NeuroFlux Governor")

		const maxReputationNeeded = factionAugmentations
			// TODO: once I stop manually buying them in the UI this probably won't be necessary
			// only care about unowned for this calculation
			.filter(augmentation => !augmentation.acquired)
			.reduce((acc, augmentation) => {
				if (acc < augmentation.reputationRequirement) {
					return augmentation.reputationRequirement
				}
				return acc
			}, 0)

		return ns.singularity.getFactionRep(faction) < maxReputationNeeded
	}


	while (true) {
		refreshFactionInvitations()
		refreshOwnedAugmentations()

		// attempt to accept any faction invitations we know we want to join that we have an invite pending for
		for (const factionInvite of factionInvitations) {
			if ([
				// FactionName.CyberSec,
				FactionName.Netburners,
				FactionName.NiteSec,
				FactionName.BitRunners,
				FactionName.TheBlackHand,
				FactionName.TianDiHui,
			].includes(factionInvite as FactionName)) {
				ns.tprint(`Accepting faction invite from ${factionInvite}`)
				ns.singularity.joinFaction(factionInvite)
			}
		}

		// perform work for a faction if needed
		if (currentFactionEngagement) {
			// stop current work to keep tracking progress
			ns.singularity.stopAction()
			currentFactionEngagement = undefined
		}
		for (const factionName of ALL_FACTION_NAMES) {
			if (furtherWorkNeededForFaction(factionName)) {
				ns.singularity.workForFaction(factionName, "hacking")
				break
			}
		}

		await ns.sleep(MINUTE_MS)
	}
}
