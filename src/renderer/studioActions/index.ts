/**
 * Studio Actions Registry
 *
 * Enables agents to control NPC Studio UI via tool calls.
 * Actions with the `studio.*` prefix are intercepted by the frontend
 * and executed directly (no backend round-trip needed).
 */

export interface StudioContext {
  // Layout state
  rootLayoutNode: any;
  contentDataRef: React.MutableRefObject<Record<string, any>>;
  activeContentPaneId: string;

  // State setters
  setActiveContentPaneId: (id: string) => void;
  setRootLayoutNode: (node: any) => void;

  // Pane operations
  performSplit: (targetPath: number[], side: string, contentType: string, contentId: string) => void;
  closeContentPane: (paneId: string, nodePath: number[]) => void;
  updateContentPane: (paneId: string, contentType: string, contentId: string, skipMessageLoad?: boolean) => void;

  // Tab operations
  handleAddTab?: (paneId: string, contentType: string) => void;
  handleTabClose?: (paneId: string, tabIndex: number) => void;
  handleTabSelect?: (paneId: string, tabIndex: number) => void;

  // UI operations
  toggleZenMode?: (paneId: string) => void;

  // Utilities
  generateId: () => string;
  findPanePath: (node: any, paneId: string, path?: number[]) => number[] | null;
}

export interface StudioActionResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

export type StudioActionHandler = (
  args: Record<string, any>,
  ctx: StudioContext
) => Promise<StudioActionResult>;

// Action registry - must be defined before any imports that use it
const actions: Record<string, StudioActionHandler> = {};

/**
 * Register a studio action handler
 */
export function registerAction(name: string, handler: StudioActionHandler): void {
  actions[name] = handler;
}

/**
 * Execute a studio action by name
 */
export async function executeStudioAction(
  name: string,
  args: Record<string, any>,
  ctx: StudioContext
): Promise<StudioActionResult> {
  // Ensure actions are initialized
  initializeActions();

  const handler = actions[name];

  if (!handler) {
    return {
      success: false,
      error: `Unknown studio action: ${name}. Available: ${Object.keys(actions).join(', ')}`
    };
  }

  try {
    return await handler(args, ctx);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get list of registered action names
 */
export function getRegisteredActions(): string[] {
  initializeActions();
  return Object.keys(actions);
}

/**
 * Check if an action is registered
 */
export function hasAction(name: string): boolean {
  initializeActions();
  return name in actions;
}

// Lazy initialization flag
let actionsInitialized = false;

/**
 * Initialize all action modules (called lazily on first use)
 */
function initializeActions(): void {
  if (actionsInitialized) return;
  actionsInitialized = true;

  // Import action modules to trigger their registration
  // Using dynamic imports to avoid circular dependency issues
  require('./paneActions');
  require('./contentActions');
  require('./tabActions');
  require('./browserActions');
  require('./uiActions');

  console.log('[StudioActions] Initialized actions:', Object.keys(actions));
}
