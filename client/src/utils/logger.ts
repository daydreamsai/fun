/**
 * Système de logging conditionnel pour optimiser les performances
 * - Debug logs uniquement en mode développement avec flag activé
 * - Info logs uniquement en développement  
 * - Error logs toujours actifs
 */

const isDev = import.meta.env.DEV;
const isDebugMode = typeof window !== 'undefined' 
  ? localStorage.getItem('gigaverse-debug') === 'true'
  : false;

export const logger = {
  /**
   * Logs de debug - Uniquement en dev avec flag debug activé
   * Usage: logger.debug("Parsing dungeon state", { playerHealth: 100 })
   */
  debug: (message: string, data?: unknown) => {
    if (isDev && isDebugMode) {
      console.log(`🔍 ${message}`, data);
    }
  },

  /**
   * Logs d'information - Uniquement en développement
   * Usage: logger.info("User started new run", { dungeonId: 1 })
   */
  info: (message: string, data?: unknown) => {
    if (isDev) {
      console.log(`ℹ️ ${message}`, data);
    }
  },

  /**
   * Logs d'erreur - Toujours actifs (dev + production)
   * Usage: logger.error("API call failed", error)
   */
  error: (message: string, data?: unknown) => {
    console.error(`❌ ${message}`, data);
  },

  /**
   * Logs de warning - Toujours actifs
   * Usage: logger.warn("Player health critical", { health: 5 })
   */
  warn: (message: string, data?: unknown) => {
    console.warn(`⚠️ ${message}`, data);
  },

  /**
   * Toggle debug mode from console
   * Usage: window.toggleGigaverseDebug()
   */
  toggleDebug: () => {
    const newState = !isDebugMode;
    localStorage.setItem('gigaverse-debug', newState.toString());
    console.log(`🔧 Gigaverse debug mode ${newState ? 'enabled' : 'disabled'}`);
    window.location.reload(); // Refresh pour appliquer les changements
  }
};

// Exposer la fonction de toggle en mode développement
if (isDev && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).toggleGigaverseDebug = logger.toggleDebug;
  
  // Info sur comment activer le debug
  if (!isDebugMode) {
    console.log('💡 Pour activer les logs debug: window.toggleGigaverseDebug()');
  }
}