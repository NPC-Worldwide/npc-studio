/**
 * Tab Actions
 *
 * Actions for managing tabs within panes:
 * - add_tab, close_tab, switch_tab, list_tabs
 */

import { registerAction, StudioContext, StudioActionResult } from './index';

/**
 * Add a new tab to a pane
 */
async function add_tab(
  args: { paneId?: string; type: string; path?: string },
  ctx: StudioContext
): Promise<StudioActionResult> {
  const { type, path } = args;

  if (!type) {
    return { success: false, error: 'type is required' };
  }

  const paneId = args.paneId === 'active' || !args.paneId
    ? ctx.activeContentPaneId
    : args.paneId;

  if (!ctx.handleAddTab) {
    return { success: false, error: 'Tab management not available' };
  }

  ctx.handleAddTab(paneId, type);

  // Update the new tab's content if path provided
  if (path) {
    const data = ctx.contentDataRef.current[paneId];
    if (data?.tabs) {
      const newTabIndex = data.tabs.length - 1;
      data.tabs[newTabIndex].contentId = path;
    }
  }

  return {
    success: true,
    paneId,
    type,
    path
  };
}

/**
 * Close a tab in a pane
 */
async function close_tab(
  args: { paneId?: string; tabIndex: number },
  ctx: StudioContext
): Promise<StudioActionResult> {
  const { tabIndex } = args;

  if (tabIndex === undefined || tabIndex < 0) {
    return { success: false, error: 'Valid tabIndex is required' };
  }

  const paneId = args.paneId === 'active' || !args.paneId
    ? ctx.activeContentPaneId
    : args.paneId;

  if (!ctx.handleTabClose) {
    return { success: false, error: 'Tab management not available' };
  }

  const data = ctx.contentDataRef.current[paneId];
  if (!data?.tabs || tabIndex >= data.tabs.length) {
    return { success: false, error: `Invalid tab index: ${tabIndex}` };
  }

  ctx.handleTabClose(paneId, tabIndex);

  return {
    success: true,
    paneId,
    closedTabIndex: tabIndex
  };
}

/**
 * Switch to a specific tab
 */
async function switch_tab(
  args: { paneId?: string; tabIndex: number },
  ctx: StudioContext
): Promise<StudioActionResult> {
  const { tabIndex } = args;

  if (tabIndex === undefined || tabIndex < 0) {
    return { success: false, error: 'Valid tabIndex is required' };
  }

  const paneId = args.paneId === 'active' || !args.paneId
    ? ctx.activeContentPaneId
    : args.paneId;

  if (!ctx.handleTabSelect) {
    return { success: false, error: 'Tab management not available' };
  }

  const data = ctx.contentDataRef.current[paneId];
  if (!data?.tabs || tabIndex >= data.tabs.length) {
    return { success: false, error: `Invalid tab index: ${tabIndex}` };
  }

  ctx.handleTabSelect(paneId, tabIndex);

  return {
    success: true,
    paneId,
    activeTabIndex: tabIndex
  };
}

/**
 * List all tabs in a pane
 */
async function list_tabs(
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

  const tabs = data.tabs || [{
    type: data.contentType,
    contentId: data.contentId,
    title: data.contentId
  }];

  return {
    success: true,
    paneId,
    tabs: tabs.map((tab: any, idx: number) => ({
      index: idx,
      type: tab.contentType || tab.type,
      path: tab.contentId,
      title: tab.title,
      isActive: idx === (data.activeTabIndex || 0)
    })),
    activeTabIndex: data.activeTabIndex || 0,
    count: tabs.length
  };
}

// Register all tab actions
registerAction('add_tab', add_tab);
registerAction('close_tab', close_tab);
registerAction('switch_tab', switch_tab);
registerAction('list_tabs', list_tabs);
