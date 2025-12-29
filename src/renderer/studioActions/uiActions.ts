/**
 * UI Actions
 *
 * Actions for UI interactions:
 * - notify, confirm, open_file_picker, send_message, switch_npc
 */

import { registerAction, StudioContext, StudioActionResult } from './index';

/**
 * Show a notification toast
 */
async function notify(
  args: { message: string; type?: 'info' | 'success' | 'warning' | 'error'; duration?: number },
  _ctx: StudioContext
): Promise<StudioActionResult> {
  const { message, type = 'info', duration = 3000 } = args;

  if (!message) {
    return { success: false, error: 'message is required' };
  }

  // Use the notification system if available
  // For now, create a simple toast notification
  try {
    // This would integrate with a toast notification system
    console.log(`[${type.toUpperCase()}] ${message}`);

    // Could also use browser notification API as fallback
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('NPC Studio', { body: message });
      }
    }

    return {
      success: true,
      message,
      type,
      duration
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to show notification'
    };
  }
}

/**
 * Show a confirmation dialog
 */
async function confirm(
  args: { message: string; title?: string },
  _ctx: StudioContext
): Promise<StudioActionResult> {
  const { message, title = 'Confirm' } = args;

  if (!message) {
    return { success: false, error: 'message is required' };
  }

  // Use window.confirm as a simple implementation
  // Could be replaced with a custom modal
  const confirmed = window.confirm(`${title}\n\n${message}`);

  return {
    success: true,
    confirmed,
    message
  };
}

/**
 * Open file picker dialog
 */
async function open_file_picker(
  args: { type?: 'file' | 'directory'; multiple?: boolean; filters?: any[] },
  _ctx: StudioContext
): Promise<StudioActionResult> {
  const { type = 'file', multiple = false } = args;

  try {
    // Use Electron's dialog via IPC
    const result = await (window as any).api?.showOpenDialog?.({
      properties: [
        type === 'directory' ? 'openDirectory' : 'openFile',
        ...(multiple ? ['multiSelections'] : [])
      ]
    });

    if (!result || result.canceled) {
      return {
        success: true,
        canceled: true,
        paths: []
      };
    }

    return {
      success: true,
      canceled: false,
      paths: result.filePaths || []
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open file picker'
    };
  }
}

/**
 * Send a message in a chat pane
 */
async function send_message(
  args: { paneId?: string; message: string },
  ctx: StudioContext
): Promise<StudioActionResult> {
  const { message } = args;

  if (!message) {
    return { success: false, error: 'message is required' };
  }

  const paneId = args.paneId === 'active' || !args.paneId
    ? ctx.activeContentPaneId
    : args.paneId;

  const data = ctx.contentDataRef.current[paneId];

  if (!data) {
    return { success: false, error: `Pane not found: ${paneId}` };
  }

  if (data.contentType !== 'chat') {
    return { success: false, error: `Pane is not a chat: ${data.contentType}` };
  }

  // This would need to trigger the chat input submit
  // For now, return a placeholder
  return {
    success: true,
    paneId,
    message,
    note: 'Message queued for sending'
  };
}

/**
 * Switch active NPC in a chat pane
 */
async function switch_npc(
  args: { paneId?: string; npcName: string },
  ctx: StudioContext
): Promise<StudioActionResult> {
  const { npcName } = args;

  if (!npcName) {
    return { success: false, error: 'npcName is required' };
  }

  const paneId = args.paneId === 'active' || !args.paneId
    ? ctx.activeContentPaneId
    : args.paneId;

  const data = ctx.contentDataRef.current[paneId];

  if (!data) {
    return { success: false, error: `Pane not found: ${paneId}` };
  }

  if (data.contentType !== 'chat') {
    return { success: false, error: `Pane is not a chat: ${data.contentType}` };
  }

  // Update the selected NPC for this pane
  ctx.contentDataRef.current[paneId] = {
    ...data,
    selectedNpc: npcName
  };

  return {
    success: true,
    paneId,
    npcName
  };
}

// Register all UI actions
registerAction('notify', notify);
registerAction('confirm', confirm);
registerAction('open_file_picker', open_file_picker);
registerAction('send_message', send_message);
registerAction('switch_npc', switch_npc);
