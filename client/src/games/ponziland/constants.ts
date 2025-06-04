import ponziland_manifest from "./configs/ponziland_manifest_mainnet.json";
import view_manifest from "./configs/view_manifest_mainnet.json";

export { view_manifest };
export const manifest = ponziland_manifest;
export const ponziland_address = manifest.contracts[0].address;
export const estark_address =
  "0x056893df1e063190aabda3c71304e9842a1b3d638134253dd0f69806a4f106eb";
export const TORII_URL = "https://api.cartridge.gg/x/ponziland-tourney-2/torii";
