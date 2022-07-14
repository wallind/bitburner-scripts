/**
 * All the factions in the game.
 * 
 * TODO: add more factions
 */
export enum FactionName {

	// CyberSec = "CyberSec",

	/**
	 * mostly Hacknet augs
	 */
	Netburners = "Netburners",
	NiteSec = "NiteSec",
	BitRunners = "BitRunners",
	TheBlackHand = "The Black Hand",
	TianDiHui = "Tian Di Hui",
	/**
	 * TODO: CHECK FOR CONFLICTS
	 */
	Daedalus = "Daedalus",
	/**
	 * CONFLICTS! TODO: be better about this
	 */
	Sector12 = "Sector-12",
}

export interface FactionAugmentation {
	name: string
	reputationRequirement: number
	acquired: boolean
}
