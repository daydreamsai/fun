export function calculateEnergy(energy: number, lastClaim: number) {
  const regenRate = 2777777;
  const now = Date.now() / 1000;
  const timeSinceLastClaim = now - lastClaim;
  const energyToAdd = regenRate * timeSinceLastClaim;
  const newEnergy = (energyToAdd + energy) / 1000000000;
  return newEnergy;
}
