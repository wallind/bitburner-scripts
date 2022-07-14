/**
 * All the factions in the game. (well it will be)
 */
export enum FactionName {

	// CyberSec = "CyberSec",
	Netburners = "Netburners",
	NiteSec = "NiteSec",
	BitRunners = "BitRunners",
	TheBlackHand = "The Black Hand",
	TianDiHui = "Tian Di Hui",
	// TODO: add more factions
}

export interface FactionAugmentation {
	name: string
	reputationRequirement: number
	acquired: boolean
}
