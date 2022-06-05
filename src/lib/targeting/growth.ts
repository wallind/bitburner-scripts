import { Player, Server } from '/definitions/Bitburner'

/**
 * TODO:
 * 
 * @param server 
 * @param threads 
 * @param p 
 * @param cores 
 * @returns 
 */
export const calculateServerGrowth = (server: Server, threads: number, p: Player, cores = 1) => {
	const CONSTANTS = {
		ServerBaseGrowthRate: 1.03, // Unadjusted Growth rate
		ServerMaxGrowthRate: 1.0035,
	}

	const BitNodeMultipliers = {
		Singularity: {
			ServerGrowthRate: 1
		}
	}

	const numServerGrowthCycles = Math.max(Math.floor(threads), 0)

	//Get adjusted growth rate, which accounts for server security
	const growthRate = CONSTANTS.ServerBaseGrowthRate
	let adjGrowthRate = 1 + (growthRate - 1) / server.hackDifficulty
	if (adjGrowthRate > CONSTANTS.ServerMaxGrowthRate) {
		adjGrowthRate = CONSTANTS.ServerMaxGrowthRate
	}

	//Calculate adjusted server growth rate based on parameters
	const serverGrowthPercentage = server.serverGrowth / 100
	const numServerGrowthCyclesAdjusted =
		numServerGrowthCycles * serverGrowthPercentage * BitNodeMultipliers.Singularity.ServerGrowthRate
	const coreBonus = 1 + (cores - 1) / 16

	// Apply serverGrowth for the calculated number of growth cycles
	// and return the growth amount (percentage represented as decimal) that will result from the growth
	return Math.pow(adjGrowthRate, numServerGrowthCyclesAdjusted * p.hacking_grow_mult * coreBonus) - 1
}
