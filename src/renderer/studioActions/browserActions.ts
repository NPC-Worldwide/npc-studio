/**
 * Browser Actions
 *
 * Actions for controlling browser panes:
 * - navigate, browser_back, browser_forward, get_browser_info
 */

import { registerAction, StudioContext, StudioActionResult } from './index';

/**
 * Navigate a browser pane to a URL
 */
async function navigate(
  args: { paneId?: string; url: string },
  ctx: StudioContext
): Promise<StudioActionResult> {
  const { url } = args;

  if (!url) {
    return { success: false, error: 'url is required' };
  }

  const paneId = args.paneId === 'active' || !args.paneId
    ? ctx.activeContentPaneId
    : args.paneId;

  const data = ctx.contentDataRef.current[paneId];

  if (!data) {
    return { success: false, error: `Pane not found: ${paneId}` };
  }

  if (data.contentType !== 'browser') {
    return { success: false, error: `Pane is not a browser: ${data.contentType}` };
  }

  // Update the browser URL
  ctx.contentDataRef.current[paneId] = {
    ...data,
    browserUrl: url,
    contentId: url
  };

  // Trigger re-render
  ctx.updateContentPane(paneId, 'browser', url);

  return {
    success: true,
    paneId,
    url
  };
}

/**
 * Navigate browser back
 */
async function browser_back(
  args: { paneId?: string },
  ctx: StudioContext
): Promise<StudioActionResult> {
  const paneId = args.paneId === 'active' || !args.paneId
    ? ctx.activeContentPaneId
    : args.paneId;

  const data = ctx.contentDataRef.current[paneId];

  if (!data) {
    return { success: false, error: `Pane not found: ${paneId}` };
  }

  if (data.contentType !== 'browser') {
    return { success: false, error: `Pane is not a browser: ${data.contentType}` };
  }

  // Browser back would need to be implemented via webview API
  // This is a placeholder that would trigger the actual navigation

  return {
    success: true,
    paneId,
    action: 'back'
  };
}

/**
 * Navigate browser forward
 */
async function browser_forward(
  args: { paneId?: string },
  ctx: StudioContext
): Promise<StudioActionResult> {
  const paneId = args.paneId === 'active' || !args.paneId
    ? ctx.activeContentPaneId
    : args.paneId;

  const data = ctx.contentDataRef.current[paneId];

  if (!data) {
    return { success: false, error: `Pane not found: ${paneId}` };
  }

  if (data.contentType !== 'browser') {
    return { success: false, error: `Pane is not a browser: ${data.contentType}` };
  }

  // Browser forward would need to be implemented via webview API

  return {
    success: true,
    paneId,
    action: 'forward'
  };
}

/**
 * Get browser pane info
 */
async function get_browser_info(
  args: { paneId?: string },
  ctx: StudioContext
): Promise<StudioActionResult> {
  const paneId = args.paneId === 'active' || !args.paneId
    ? ctx.activeContentPaneId
    : args.paneId;

  const data = ctx.contentDataRef.current[paneId];

  if (!data) {
    return { success: false, error: `Pane not found: ${paneId}` };
  }

  if (data.contentType !== 'browser') {
    return { success: false, error: `Pane is not a browser: ${data.contentType}` };
  }

  return {
    success: true,
    paneId,
    url: data.browserUrl || data.contentId,
    title: data.browserTitle || 'Browser'
  };
}

// Register all browser actions
registerAction('navigate', navigate);
registerAction('browser_back', browser_back);
registerAction('browser_forward', browser_forward);
registerAction('get_browser_info', get_browser_info);
