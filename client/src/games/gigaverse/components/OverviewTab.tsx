import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";
import { DungeonState } from "./Dungeons";
import { Startup } from "./Startup";
import { useQuery } from "@tanstack/react-query";
import { GearInstancesResponse } from "../client/GameClient";
import { useSettingsStore } from "@/store/settingsStore";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UpdateStats {
  lastUpdateTime: number;
  pendingUpdates: number;
  totalUpdates: number;
  isUpdating: boolean;
}

export function OverviewTab({
  state,
  lastUpdated,
  refresh,
  updateStats,
}: {
  state: ContextState<GigaverseContext> | undefined;
  lastUpdated: number;
  refresh: () => void;
  updateStats?: UpdateStats;
}) {
  // ALL hooks must be called at the top level, unconditionally
  const abstractAddress = useSettingsStore((s) => s.abstractAddress);
  const [sackSlots, setSackSlots] = useState<(string | null)[]>([null, null, null]);

  const gearInstancesQuery = useQuery({
    queryKey: ["gearInstances", abstractAddress],
    queryFn: async (): Promise<GearInstancesResponse> => {
      if (!state?.options?.client || !abstractAddress) {
        throw new Error("No client or address available");
      }
      return state.options.client.getGearInstances(abstractAddress);
    },
    enabled: !!state?.options?.client && !!abstractAddress,
  });

  // Early returns AFTER all hooks
  if (!state) return null;

  const { dungeon } = state.memory;
  const { game } = state.options;
  const player = game?.player;
  
  if (!player) {
    return (
      <div className="p-4 border rounded-lg bg-card">
        <div className="text-sm text-muted-foreground">Loading player data...</div>
      </div>
    );
  }
  
  const juice = player.juice;

  // Calculate juice days remaining
  const calculateJuiceDaysRemaining = () => {
    if (!juice?.juiceData?.isJuiced) return 0;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const juicedSeconds = juice.juiceData.juicedSeconds;
    const juiceStartTime = juice.juiceData.TIMESTAMP_CID;
    
    // Find the highest duration juice purchased to determine total duration
    let totalJuiceDuration = 0;
    if (juice.purchases && juice.listings) {
      juice.purchases.forEach(purchase => {
        const listing = juice.listings.find(l => l.docId === purchase.ID_CID);
        if (listing) {
          totalJuiceDuration = Math.max(totalJuiceDuration, listing.TIME_BETWEEN_CID);
        }
      });
    }
    
    const juiceEndTime = juiceStartTime + totalJuiceDuration;
    const remainingSeconds = Math.max(0, juiceEndTime - currentTime);
    const remainingDays = Math.floor(remainingSeconds / (24 * 60 * 60));
    
    return remainingDays;
  };

  const juiceDaysRemaining = calculateJuiceDaysRemaining();

  // Map equipped gear instances
  const equippedGear = {
    headVanity: null as any,
    bodyVanity: null as any,
    headGear: null as any,
    bodyGear: null as any,
    charm1: null as any,
    charm2: null as any,
    rod: null as any,
  };

  // First, get vanity items from the existing gear object (these are the Gigapengu items)
  if (player.gear?.head) {
    equippedGear.headVanity = { itemData: player.gear.head };
  }
  if (player.gear?.body) {
    equippedGear.bodyVanity = { itemData: player.gear.body };
  }

  // Then get equipped gear instances for functional gear
  if (gearInstancesQuery.data?.entities && game?.offchain?.gameItems) {
    gearInstancesQuery.data.entities.forEach(gear => {
      // Find the game item data for this gear
      const itemData = game.offchain.gameItems.find(item => item.ID_CID === gear.GAME_ITEM_ID_CID);
      
      if (gear.EQUIPPED_TO_SLOT_CID !== -1 && itemData) {
        const gearWithItemData = { ...gear, itemData };
        
        // Map slots based on EQUIPPED_TO_SLOT_CID
        switch (gear.EQUIPPED_TO_SLOT_CID) {
          case 2: // Head gear
            equippedGear.headGear = gearWithItemData;
            break;
          case 3: // Body gear
            equippedGear.bodyGear = gearWithItemData;
            break;
          case 6: // Charms (use EQUIPPED_TO_INDEX_CID to distinguish)
            if (gear.EQUIPPED_TO_INDEX_CID === 0) {
              equippedGear.charm1 = gearWithItemData;
            } else if (gear.EQUIPPED_TO_INDEX_CID === 1) {
              equippedGear.charm2 = gearWithItemData;
            }
            break;
          case 7: // Rod
            equippedGear.rod = gearWithItemData;
            break;
        }
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Panel 1: Player Info */}
      <div className="p-4 border rounded-lg bg-card space-y-3">
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="font-medium">
              {player.account?.usernames?.[0]?.NAME_CID || "Unknown"} - Noob #{player.account?.noob?.docId || "Unknown"} - {juice?.juiceData?.isJuiced ? `Juiced (${juiceDaysRemaining} days left)` : "Standard"}
            </div>
            <div className="text-sm text-muted-foreground">
              {abstractAddress}
            </div>
          </div>
          
          {/* Energy Section */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Energy:</div>
            {player.energy?.entities?.[0]?.parsedData ? (
              <>
                <div className="text-sm">
                  <span>{player.energy.entities[0].parsedData.energyValue} / {player.energy.entities[0].parsedData.maxEnergy}</span>
                  <span className="text-muted-foreground ml-2">+{player.energy.entities[0].parsedData.regenPerHour}/h</span>
                </div>
                
                {/* Energy Bar */}
                <div className="relative w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-2 transition-all duration-500 rounded-full ${
                      player.energy.entities[0].parsedData.isPlayerJuiced ? "bg-accent" : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min(100, (player.energy.entities[0].parsedData.energyValue / player.energy.entities[0].parsedData.maxEnergy) * 100)}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Loading energy data...</div>
            )}
          </div>
          
          
          {/* Start New Run Section */}
          <div className="space-y-2 border-t pt-2">
            <div className="text-sm font-medium">Start New Run</div>
            <Startup state={state} compact={true} />
          </div>
        </div>
      </div>

      {/* Panel 2: Equipment - Interactive Equipment Panel */}
      <div className="p-4 border rounded-lg bg-card">
        <div className="text-sm font-medium mb-4">Equipment</div>
        
        {gearInstancesQuery.isLoading ? (
          <div className="text-sm text-muted-foreground text-center">Loading equipment...</div>
        ) : (
          <div className="space-y-3">
            {/* Head Gear */}
            <InteractiveEquipmentSlot 
              label="Head Gear"
              item={equippedGear.headGear}
              slot="head"
              gameClient={state?.options?.client}
              playerAccount={player.account}
              gearInstancesQuery={gearInstancesQuery}
              game={game}
              refreshGameData={refresh}
            />

            {/* Body Gear */}
            <InteractiveEquipmentSlot 
              label="Body Gear"
              item={equippedGear.bodyGear}
              slot="body"
              gameClient={state?.options?.client}
              playerAccount={player.account}
              gearInstancesQuery={gearInstancesQuery}
              game={game}
              refreshGameData={refresh}
            />

            {/* Charm 1 */}
            <InteractiveEquipmentSlot 
              label="Charm #1"
              item={equippedGear.charm1}
              slot="charm1"
              gameClient={state?.options?.client}
              playerAccount={player.account}
              gearInstancesQuery={gearInstancesQuery}
              game={game}
              refreshGameData={refresh}
            />

            {/* Charm 2 */}
            <InteractiveEquipmentSlot 
              label="Charm #2"
              item={equippedGear.charm2}
              slot="charm2"
              gameClient={state?.options?.client}
              playerAccount={player.account}
              gearInstancesQuery={gearInstancesQuery}
              game={game}
              refreshGameData={refresh}
            />

            {/* Rod */}
            <InteractiveEquipmentSlot 
              label="Rod"
              item={equippedGear.rod}
              slot="rod"
              gameClient={state?.options?.client}
              playerAccount={player.account}
              gearInstancesQuery={gearInstancesQuery}
              game={game}
              refreshGameData={refresh}
            />

            {/* Vanity Items */}
            {/* <div className="grid grid-cols-2 gap-3">
              {/* Head Vanity */}
              {/* <div className="border rounded-lg p-3 bg-card/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Head Vanity</span>
                </div>
                
                {equippedGear.headVanity ? (
                  <div className="flex items-center gap-2">
                    <img 
                      src={equippedGear.headVanity.itemData.IMG_URL_CID} 
                      alt={equippedGear.headVanity.itemData.NAME_CID}
                      className="w-10 h-10 object-contain rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">{equippedGear.headVanity.itemData.NAME_CID}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-12 text-muted-foreground text-xs">
                    None
                  </div>
                )}
              </div>

              {/* Body Vanity */}
              {/* <div className="border rounded-lg p-3 bg-card/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Body Vanity</span>
                </div>
                
                {equippedGear.bodyVanity ? (
                  <div className="flex items-center gap-2">
                    <img 
                      src={equippedGear.bodyVanity.itemData.IMG_URL_CID} 
                      alt={equippedGear.bodyVanity.itemData.NAME_CID}
                      className="w-10 h-10 object-contain rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">{equippedGear.bodyVanity.itemData.NAME_CID}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-12 text-muted-foreground text-xs">
                    None
                  </div>
                )}
              </div>
            </div> */}

            {/* Potion Sack Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Dungeon Sack</h4>
              <div className="grid grid-cols-3 gap-3">
                {sackSlots.map((selectedPotion, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-card/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Slot {index + 1}</span>
                    </div>
                    
                    <Select
                      value={selectedPotion || undefined}
                      onValueChange={(value) => {
                        const newSlots = [...sackSlots];
                        newSlots[index] = value === "none" ? null : value;
                        setSackSlots(newSlots);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select potion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {player.consumables
                          ?.filter((consumable) => 
                            consumable.balance > 0 && 
                            (consumable.item.name.toLowerCase().includes("potion") ||
                             consumable.item.name.toLowerCase().includes("elixir") ||
                             consumable.item.name.toLowerCase().includes("brew"))
                          )
                          .map((consumable) => (
                            <SelectItem 
                              key={consumable.item.id} 
                              value={consumable.item.id.toString()}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs">{consumable.item.name}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  x{consumable.balance}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedPotion && (
                      <div className="mt-2">
                        {(() => {
                          const potion = player.consumables?.find(c => c.item.id.toString() === selectedPotion);
                          return potion ? (
                            <div className="flex items-center gap-2">
                              <img 
                                src={potion.item.image || "/placeholder-potion.png"} 
                                alt={potion.item.name}
                                className="w-8 h-8 object-contain rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs truncate">{potion.item.name}</div>
                                <Badge variant="secondary" className="text-[10px]">
                                  x{potion.balance}
                                </Badge>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Equipment Slot Component
function EquipmentSlot({ 
  label, 
  item, 
  position 
}: { 
  label: string; 
  item: any; 
  position: string;
}) {
  const getRarityColor = (rarity?: number) => {
    switch (rarity) {
      case 0: return 'border-gray-400'; // Common
      case 1: return 'border-green-400'; // Uncommon  
      case 2: return 'border-blue-400'; // Rare
      case 3: return 'border-purple-400'; // Epic
      case 4: return 'border-orange-400'; // Legendary
      default: return 'border-gray-600';
    }
  };

  const getLabelPosition = () => {
    const baseClasses = "absolute text-xs text-muted-foreground whitespace-nowrap";
    switch (position) {
      case 'top-left':
        return `${baseClasses} -top-5 left-0`;
      case 'top-right':
        return `${baseClasses} -top-5 right-0`;
      case 'middle-left':
        return `${baseClasses} -top-5 left-0`;
      case 'middle-right':
        return `${baseClasses} -top-5 right-0`;
      case 'bottom-left':
        return `${baseClasses} -bottom-5 left-0`;
      case 'bottom-center':
        return `${baseClasses} -bottom-5 left-1/2 -translate-x-1/2`;
      case 'bottom-right':
        return `${baseClasses} -bottom-5 right-0`;
      default:
        return `${baseClasses} -top-5 left-0`;
    }
  };

  return (
    <div className="relative">
      <div className={getLabelPosition()}>
        {label}
      </div>
      <div 
        className={`w-16 h-16 border-2 bg-gray-900/50 flex items-center justify-center relative ${
          item ? getRarityColor(item.RARITY_CID || item.itemData?.RARITY_CID) : 'border-gray-600'
        }`}
      >
        {item?.itemData ? (
          <>
            <img 
              src={item.itemData.IMG_URL_CID} 
              alt={item.itemData.NAME_CID}
              className="w-12 h-12 object-contain"
            />
            {/* Durability indicator */}
            {item.DURABILITY_CID !== undefined && (
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs px-1 rounded">
                {item.DURABILITY_CID}
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-600 text-2xl">+</div>
        )}
      </div>
    </div>
  );
}

// Interactive Equipment Slot Component
function InteractiveEquipmentSlot({ 
  label, 
  item, 
  slot,
  gameClient,
  playerAccount,
  gearInstancesQuery,
  game,
  refreshGameData
}: { 
  label: string; 
  item: any; 
  slot: string;
  gameClient: any;
  playerAccount: any;
  gearInstancesQuery: any;
  game: any;
  refreshGameData: () => void;
}) {
  const [showEquipOptions, setShowEquipOptions] = useState(false);
  const [isEquipping, setIsEquipping] = useState(false);
  
  // Map slot names to slot types
  const getSlotType = (slot: string): number => {
    switch (slot) {
      case 'head': return 2;
      case 'body': return 3;
      case 'charm1': return 6; // Charms use slotType 6
      case 'charm2': return 6; // Charms use slotType 6
      case 'rod': return 7; // Rod should be 7, not 6
      default: return 2;
    }
  };

  const getSlotIndex = (slot: string): number => {
    // Charms use different slot indices
    switch (slot) {
      case 'charm1': return 0;
      case 'charm2': return 1;
      default: return 0;
    }
  };

  const handleEquipItem = async (gearInstance: any) => {
    if (!gameClient || isEquipping) return;
    
    setIsEquipping(true);
    try {
      const response = await gameClient.setGear({
        gearInstanceId: gearInstance.docId,
        slotType: getSlotType(slot),
        slotIndex: getSlotIndex(slot),
      });

      console.log("✅ Item equipped successfully");
      setShowEquipOptions(false);
      // Refresh data
      setTimeout(() => {
        gearInstancesQuery.refetch();
        refreshGameData();
      }, 1000);
    } catch (error) {
      console.error("❌ Error equipping item:", error);
    } finally {
      setIsEquipping(false);
    }
  };

  const handleUnequipItem = async () => {
    if (!gameClient || isEquipping || !item) return;
    
    setIsEquipping(true);
    try {
      const response = await gameClient.setGear({
        gearInstanceId: item.docId, // Include the current item's docId
        slotType: -1, // Use -1 for unequip
        slotIndex: -1, // Use -1 for unequip
      });

      console.log("✅ Item unequipped successfully");
      setShowEquipOptions(false);
      // Refresh data
      setTimeout(() => {
        gearInstancesQuery.refetch();
        refreshGameData();
      }, 1000);
    } catch (error) {
      console.error("❌ Error unequipping item:", error);
    } finally {
      setIsEquipping(false);
    }
  };

  const getRarityColor = (rarity?: number) => {
    switch (rarity) {
      case 0: return 'border-gray-400'; // Common
      case 1: return 'border-green-400'; // Uncommon  
      case 2: return 'border-blue-400'; // Rare
      case 3: return 'border-purple-400'; // Epic
      case 4: return 'border-orange-400'; // Legendary
      default: return 'border-gray-600';
    }
  };

  const getItemStats = (item: any) => {
    if (!item?.itemData) return null;
    
    const stats = [];
    
    // Add attack if present
    if (item.itemData.ATK_CID && item.itemData.ATK_CID > 0) {
      stats.push({ label: 'ATK', value: item.itemData.ATK_CID });
    }
    
    // Add defense if present
    if (item.itemData.DEF_CID && item.itemData.DEF_CID > 0) {
      stats.push({ label: 'DEF', value: item.itemData.DEF_CID });
    }
    
    // Add other stats that might exist
    if (item.itemData.SPEED_CID && item.itemData.SPEED_CID > 0) {
      stats.push({ label: 'SPD', value: item.itemData.SPEED_CID });
    }
    
    if (item.itemData.LUCK_CID && item.itemData.LUCK_CID > 0) {
      stats.push({ label: 'LUCK', value: item.itemData.LUCK_CID });
    }
    
    return stats.length > 0 ? stats : null;
  };

  const stats = getItemStats(item);

  return (
    <div className="border rounded-lg p-3 bg-card/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Item Icon - Clickable */}
          <div 
            className={`w-12 h-12 border-2 bg-gray-900/50 flex items-center justify-center relative cursor-pointer transition-all ${
              item ? getRarityColor(item.RARITY_CID || item.itemData?.RARITY_CID) : 'border-gray-600'
            }`}
            onClick={() => setShowEquipOptions(!showEquipOptions)}
          >
            {item?.itemData ? (
              <>
                <img 
                  src={item.itemData.IMG_URL_CID} 
                  alt={item.itemData.NAME_CID}
                  className="w-10 h-10 object-contain"
                />
                {/* Durability indicator */}
                {item.DURABILITY_CID !== undefined && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs px-1 rounded">
                    {item.DURABILITY_CID}
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-600 text-lg">+</div>
            )}
          </div>
          
          {/* Item Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{label}:</span>
              <span className="text-sm font-medium">
                {item?.itemData?.NAME_CID || "None"}
              </span>
            </div>
            
            {/* Stats */}
            {stats && (
              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                {stats.map((stat, index) => (
                  <span key={index}>{stat.label}: {stat.value}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Equip Button */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowEquipOptions(!showEquipOptions)}
          disabled={isEquipping}
        >
          {isEquipping ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Equipment Options (expanded) */}
      {showEquipOptions && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="text-xs text-muted-foreground">Available items:</div>
          
          {gearInstancesQuery.data?.entities ? (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {gearInstancesQuery.data.entities
                .filter(gear => gear.EQUIPPED_TO_SLOT_CID === -1) // Only unequipped items
                .filter(gear => gear.DURABILITY_CID > 0) // Only items with durability > 0
                .filter(gear => {
                  // Filter by slot type based on item properties
                  const itemData = game?.offchain?.gameItems?.find(item => item.ID_CID === gear.GAME_ITEM_ID_CID);
                  if (!itemData) return false;
                  
                  // Filter items based on slot compatibility using NAME_CID and TYPE_CID
                  const itemName = itemData.NAME_CID || '';
                  const itemType = itemData.TYPE_CID || '';
                  const nameLower = itemName.toLowerCase();
                  const typeLower = itemType.toLowerCase();
                  
                  switch (slot) {
                    case 'head':
                      // Head gear: items with "head", "helmet", "hat" in name or type
                      return nameLower.includes('head') || 
                             nameLower.includes('helmet') ||
                             nameLower.includes('hat') ||
                             typeLower.includes('head') ||
                             typeLower === 'helmet';
                    
                    case 'body':
                      // Body gear: items with "body", "armor", "chest" in name or type
                      return nameLower.includes('body') || 
                             nameLower.includes('armor') ||
                             nameLower.includes('chest') ||
                             typeLower.includes('body') ||
                             typeLower === 'armor';
                    
                    case 'charm1':
                    case 'charm2':
                      // Charms: all items that are NOT head, body, rod, or hands
                      const isCharm = !nameLower.includes('head') && 
                                     !nameLower.includes('body') && 
                                     !nameLower.includes('rod') && 
                                     !nameLower.includes('hands');
                      return isCharm;
                    
                    case 'rod':
                      // Rods: fishing rods, rods, weapons
                      return nameLower.includes('rod') || 
                             nameLower.includes('fishing') ||
                             typeLower.includes('rod') ||
                             typeLower === 'fishing_rod';
                    
                    default:
                      return true;
                  }
                })
                .map(gear => {
                  const itemData = game?.offchain?.gameItems?.find(item => item.ID_CID === gear.GAME_ITEM_ID_CID);
                  if (!itemData) return null;
                  
                  // Get stats for this item
                  const itemStats = getItemStats({ itemData });
                  
                  return (
                    <div 
                      key={gear.docId}
                      className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer text-xs"
                      onClick={() => handleEquipItem(gear)}
                    >
                      <img 
                        src={itemData.IMG_URL_CID} 
                        alt={itemData.NAME_CID}
                        className="w-6 h-6 object-contain"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span>{itemData.NAME_CID}</span>
                          <span className="text-muted-foreground">({gear.DURABILITY_CID} dur)</span>
                        </div>
                        {itemStats && (
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            {itemStats.map((stat, index) => (
                              <span key={index}>{stat.label}: {stat.value}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              
              {gearInstancesQuery.data.entities.filter(gear => gear.EQUIPPED_TO_SLOT_CID === -1).length === 0 && (
                <div className="text-xs text-muted-foreground">No unequipped items available</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Loading items...</div>
          )}
          
          {/* Unequip Option */}
          {item && (
            <Button
              className="w-full mt-3"
              variant="destructive"
              onClick={() => handleUnequipItem()}
              disabled={isEquipping}
            >
              {isEquipping ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <span className="mr-2">×</span>
              )}
              Unequip
            </Button>
          )}
        </div>
      )}
    </div>
  );
}