import * as vscode from 'vscode';
import { FileTreeProvider } from './fileTreeProvider';
import { GitService } from './gitService';

type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'searchAuthors'; query: string }
  | { type: 'search'; authors: string[]; from: string; to: string };

export interface SearchCriteria {
  authors: string[];
  from: string;
  to: string;
}

export class SearchViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'gitAuthorExplorer.searchView';
  private lastSearchCriteria: SearchCriteria | undefined;

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly gitService: GitService,
    private readonly fileTreeProvider: FileTreeProvider,
    private readonly dependencyTreeProvider: FileTreeProvider,
    private readonly onSearchStarted: () => void = () => {}
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: WebviewToExtensionMessage) => {
      await this.handleMessage(message, webviewView.webview);
    });
  }

  private async handleMessage(message: WebviewToExtensionMessage, webview: vscode.Webview): Promise<void> {
    try {
      if (message.type === 'ready') {
        await this.postAuthors(webview, '');
        return;
      }

      if (message.type === 'searchAuthors') {
        await this.postAuthors(webview, message.query);
        return;
      }

      if (message.type === 'search') {
        if (!message.authors.length) {
          await webview.postMessage({ type: 'empty', message: vscode.l10n.t('Please select at least one author.') });
          return;
        }

        if (!isValidDateRange(message.from, message.to)) {
          await webview.postMessage({ type: 'error', message: vscode.l10n.t('Please check the date range.') });
          return;
        }

        await webview.postMessage({ type: 'loading', value: true });
        this.onSearchStarted();
        this.fileTreeProvider.setFilePaths([]);
        this.dependencyTreeProvider.setFilePaths([]);
        this.lastSearchCriteria = {
          authors: [...message.authors],
          from: message.from,
          to: message.to
        };
        const files = await this.gitService.searchChangedFiles(message.authors, message.from, message.to);
        this.fileTreeProvider.setChangedFiles(files);
        await webview.postMessage({ type: 'loading', value: false });

        if (!files.length) {
          await webview.postMessage({ type: 'empty', message: vscode.l10n.t('No changed files match the selected conditions.') });
        } else {
          await webview.postMessage({ type: 'result', message: vscode.l10n.t('{0} files found.', files.length) });
        }
      }
    } catch (error) {
      await webview.postMessage({ type: 'loading', value: false });
      await webview.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : vscode.l10n.t('An error occurred while querying Git.')
      });
    }
  }

  public getLastSearchCriteria(): SearchCriteria | undefined {
    return this.lastSearchCriteria
      ? {
        authors: [...this.lastSearchCriteria.authors],
        from: this.lastSearchCriteria.from,
        to: this.lastSearchCriteria.to
      }
      : undefined;
  }

  private async postAuthors(webview: vscode.Webview, query: string): Promise<void> {
    const authors = await this.gitService.getAuthors(query);
    await webview.postMessage({ type: 'authors', query, authors: authors.map((author) => author.raw) });
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const htmlLanguage = vscode.env.language.startsWith('ko') ? 'ko' : 'en';
    const messages = {
      addAll: vscode.l10n.t('Add All'),
      author: vscode.l10n.t('Author'),
      authorList: vscode.l10n.t('Author list'),
      authorSelectionMode: vscode.l10n.t('Author selection mode'),
      clearSelection: vscode.l10n.t('Clear Selection'),
      dateRange: vscode.l10n.t('Date Range'),
      from: vscode.l10n.t('From'),
      keyword: vscode.l10n.t('Keyword'),
      list: vscode.l10n.t('List'),
      noAuthorsSelected: vscode.l10n.t('Please select at least one author.'),
      noMatchingAuthors: vscode.l10n.t('No matching authors found.'),
      retry: vscode.l10n.t('Retry'),
      search: vscode.l10n.t('Search'),
      searchByNameOrEmail: vscode.l10n.t('Search by name or email'),
      searching: vscode.l10n.t('Searching...'),
      selectAuthorsHint: vscode.l10n.t('Select authors from the list after searching.'),
      selected: vscode.l10n.t('Selected'),
      to: vscode.l10n.t('To')
    };

    return `<!DOCTYPE html>
<html lang="${htmlLanguage}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Git Author Explorer</title>
  <style>
    body { padding: 12px; color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
    label { display: block; margin: 10px 0 4px; font-size: 12px; color: var(--vscode-descriptionForeground); }
    input, button { width: 100%; box-sizing: border-box; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); border-radius: 2px; padding: 6px 8px; }
    input[type="checkbox"] { width: auto; margin: 0; accent-color: var(--vscode-button-background); }
    button { margin-top: 12px; cursor: pointer; color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: none; }
    button:disabled { opacity: 0.6; cursor: default; }
    button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    button[hidden] { display: none; }
    mark { color: var(--vscode-list-highlightForeground); background: transparent; font-weight: 600; }
    .section {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    .section:first-of-type {
      margin-top: 0;
      padding-top: 0;
      border-top: 0;
    }
    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
      color: var(--vscode-foreground);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .section-title::after {
      content: "";
      flex: 1;
      height: 1px;
      background: var(--vscode-input-border);
      opacity: 0.65;
    }
    .section > label:first-child,
    .section > div:first-child > label:first-child { margin-top: 0; }
    .mode-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
    .mode-toggle input { position: absolute; opacity: 0; pointer-events: none; }
    .mode-toggle span { display: block; padding: 6px 8px; text-align: center; cursor: pointer; color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-input-border); border-radius: 2px; }
    .mode-toggle input:checked + span { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border-color: var(--vscode-button-background); }
    .dates { display: flex; flex-direction: column; gap: 0; }
    .autocomplete { position: relative; }
    .autocomplete input { padding-right: 28px; }
    .suggestions {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 10;
      max-height: 220px;
      overflow-y: auto;
      color: var(--vscode-dropdown-foreground);
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px;
      box-shadow: 0 4px 12px var(--vscode-widget-shadow);
    }
    .suggestion {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      margin: 0;
      padding: 7px 8px;
      border: 0;
      border-bottom: 1px solid var(--vscode-input-border);
      color: var(--vscode-dropdown-foreground);
      background: transparent;
      text-align: left;
      cursor: pointer;
    }
    .suggestion:last-child { border-bottom: 0; }
    .suggestion:hover,
    .suggestion.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
    .suggestion.active mark,
    .suggestion:hover mark { color: var(--vscode-list-activeSelectionForeground); }
    .suggestion-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .suggestion-empty { padding: 8px; color: var(--vscode-descriptionForeground); font-size: 12px; }
    .author-list {
      max-height: 220px;
      overflow-y: auto;
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      background: var(--vscode-input-background);
    }
    .author-option {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: start;
      gap: 8px;
      margin: 0;
      padding: 7px 8px;
      color: var(--vscode-input-foreground);
      cursor: pointer;
      border-bottom: 1px solid var(--vscode-input-border);
    }
    .author-option:last-child { border-bottom: 0; }
    .author-option:hover { background: var(--vscode-list-hoverBackground); }
    .author-option:has(input:checked) { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
    .author-option input { margin-top: 2px; }
    .author-name { overflow-wrap: anywhere; }
    .chips { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
    .author-actions { display: grid; grid-template-columns: 1fr; gap: 6px; margin-top: 6px; }
    .author-actions button { margin-top: 0; }
    .chip { display: flex; justify-content: space-between; gap: 8px; padding: 5px 6px; background: var(--vscode-list-hoverBackground); border: 1px solid transparent; border-radius: 2px; }
    .chip button { width: auto; margin: 0; padding: 0 4px; background: transparent; color: var(--vscode-foreground); }
    .empty-hint { padding: 6px 0; color: var(--vscode-descriptionForeground); font-size: 12px; }
    .status { min-height: 20px; margin-top: 12px; color: var(--vscode-descriptionForeground); }
    .error { color: var(--vscode-errorForeground); }
  </style>
</head>
<body>
  <section class="section" aria-labelledby="authorSectionTitle">
    <div id="authorSectionTitle" class="section-title">${escapeHtml(messages.author)}</div>
    <div class="mode-toggle" role="radiogroup" aria-label="${escapeHtml(messages.authorSelectionMode)}">
      <label>
        <input id="searchMode" type="radio" name="authorMode" value="search" checked>
        <span>${escapeHtml(messages.search)}</span>
      </label>
      <label>
        <input id="selectMode" type="radio" name="authorMode" value="select">
        <span>${escapeHtml(messages.list)}</span>
      </label>
    </div>

    <div id="searchPanel">
      <label for="authorQuery">${escapeHtml(messages.keyword)}</label>
      <div class="autocomplete">
        <input id="authorQuery" type="text" placeholder="${escapeHtml(messages.searchByNameOrEmail)}" autocomplete="off" aria-autocomplete="list" aria-expanded="false" aria-controls="authorSuggestions">
        <div id="authorSuggestions" class="suggestions" role="listbox" hidden></div>
      </div>
    </div>

    <div id="selectPanel" hidden>
      <label for="authorList">${escapeHtml(messages.authorList)}</label>
      <div id="authorList" class="author-list" role="group" aria-label="${escapeHtml(messages.authorList)}"></div>
      <div class="author-actions">
        <button id="addAllButton" type="button" class="secondary">${escapeHtml(messages.addAll)}</button>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="selectedSectionTitle">
    <div id="selectedSectionTitle" class="section-title">${escapeHtml(messages.selected)}</div>
    <div id="selectedAuthors" class="chips"></div>
    <button id="clearAuthorsButton" type="button" class="secondary" hidden>${escapeHtml(messages.clearSelection)}</button>
  </section>

  <section class="section" aria-labelledby="rangeSectionTitle">
    <div id="rangeSectionTitle" class="section-title">${escapeHtml(messages.dateRange)}</div>
    <div class="dates">
      <div>
        <label for="from">${escapeHtml(messages.from)}</label>
        <input id="from" type="date">
      </div>
      <div>
        <label for="to">${escapeHtml(messages.to)}</label>
        <input id="to" type="date">
      </div>
    </div>
  </section>

  <section class="section search-actions">
    <button id="searchButton">${escapeHtml(messages.search)}</button>
    <div id="status" class="status"></div>
    <button id="retryButton" class="secondary" hidden>${escapeHtml(messages.retry)}</button>
  </section>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const l10n = ${serializeForScript(messages)};
    const state = { mode: 'search', authors: [], allAuthors: [], selectedAuthors: [], loading: false, lastSearch: undefined, suggestionsOpen: false, activeSuggestion: -1 };
    const maxSuggestions = 8;
    let authorSearchTimer = undefined;
    const searchMode = document.querySelector('#searchMode');
    const selectMode = document.querySelector('#selectMode');
    const searchPanel = document.querySelector('#searchPanel');
    const selectPanel = document.querySelector('#selectPanel');
    const authorQuery = document.querySelector('#authorQuery');
    const authorSuggestions = document.querySelector('#authorSuggestions');
    const authorList = document.querySelector('#authorList');
    const addAllButton = document.querySelector('#addAllButton');
    const selectedAuthors = document.querySelector('#selectedAuthors');
    const clearAuthorsButton = document.querySelector('#clearAuthorsButton');
    const from = document.querySelector('#from');
    const to = document.querySelector('#to');
    const searchButton = document.querySelector('#searchButton');
    const status = document.querySelector('#status');
    const retryButton = document.querySelector('#retryButton');

    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    }

    function initializeDates() {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      to.value = formatDate(today);
      from.value = formatDate(weekAgo);
    }

    function render() {
      searchMode.checked = state.mode === 'search';
      selectMode.checked = state.mode === 'select';
      searchPanel.hidden = state.mode !== 'search';
      selectPanel.hidden = state.mode !== 'select';
      authorQuery.setAttribute('aria-expanded', String(state.suggestionsOpen));

      authorList.replaceChildren(...state.authors.map((author, index) => {
        const row = document.createElement('label');
        row.className = 'author-option';

        const checkbox = document.createElement('input');
        checkbox.id = 'authorOption-' + index;
        checkbox.type = 'checkbox';
        checkbox.value = author;
        checkbox.checked = state.selectedAuthors.includes(author);
        checkbox.disabled = state.loading;
        checkbox.addEventListener('change', () => toggleAuthor(author, checkbox.checked));

        const name = document.createElement('span');
        name.className = 'author-name';
        name.textContent = author;

        row.append(checkbox, name);
        return row;
      }));

      const selectedNodes = state.selectedAuthors.map((author) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        const text = document.createElement('span');
        text.textContent = author;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'x';
        remove.addEventListener('click', () => {
          state.selectedAuthors = state.selectedAuthors.filter((selected) => selected !== author);
          render();
        });
        chip.append(text, remove);
        return chip;
      });

      if (!selectedNodes.length) {
        const hint = document.createElement('div');
        hint.className = 'empty-hint';
        hint.textContent = l10n.selectAuthorsHint;
        selectedNodes.push(hint);
      }

      selectedAuthors.replaceChildren(...selectedNodes);
      renderSuggestions();

      searchButton.disabled = state.loading;
      retryButton.disabled = state.loading;
      addAllButton.disabled = state.loading || !state.authors.length;
      clearAuthorsButton.hidden = !state.selectedAuthors.length;
      clearAuthorsButton.disabled = state.loading;
    }

    function renderSuggestions() {
      const query = authorQuery.value.trim();
      const canShow = state.mode === 'search' && state.suggestionsOpen && query.length > 0;

      if (!canShow) {
        authorSuggestions.hidden = true;
        authorSuggestions.replaceChildren();
        authorQuery.removeAttribute('aria-activedescendant');
        return;
      }

      const visibleAuthors = state.authors.slice(0, maxSuggestions);

      if (!visibleAuthors.length) {
        const empty = document.createElement('div');
        empty.className = 'suggestion-empty';
        empty.textContent = l10n.noMatchingAuthors;
        authorSuggestions.hidden = false;
        authorSuggestions.replaceChildren(empty);
        authorQuery.removeAttribute('aria-activedescendant');
        return;
      }

      if (state.activeSuggestion < 0 || state.activeSuggestion >= visibleAuthors.length) {
        state.activeSuggestion = 0;
      }

      const nodes = visibleAuthors.map((author, index) => {
        const option = document.createElement('button');
        option.id = 'authorSuggestion-' + index;
        option.type = 'button';
        option.className = 'suggestion' + (index === state.activeSuggestion ? ' active' : '');
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(index === state.activeSuggestion));
        option.addEventListener('mousedown', (event) => event.preventDefault());
        option.addEventListener('click', () => selectSuggestion(author));

        const name = document.createElement('span');
        name.className = 'suggestion-name';
        appendHighlightedText(name, author, query);

        option.append(name);
        return option;
      });

      authorSuggestions.hidden = false;
      authorSuggestions.replaceChildren(...nodes);
      authorQuery.setAttribute('aria-activedescendant', 'authorSuggestion-' + state.activeSuggestion);
    }

    function appendHighlightedText(target, text, query) {
      const normalizedText = text.toLowerCase();
      const normalizedQuery = query.toLowerCase();
      const matchIndex = normalizedText.indexOf(normalizedQuery);

      if (!normalizedQuery || matchIndex < 0) {
        target.textContent = text;
        return;
      }

      target.append(
        document.createTextNode(text.slice(0, matchIndex)),
        createMark(text.slice(matchIndex, matchIndex + query.length)),
        document.createTextNode(text.slice(matchIndex + query.length))
      );
    }

    function createMark(text) {
      const mark = document.createElement('mark');
      mark.textContent = text;
      return mark;
    }

    function filterAuthors(authors, query) {
      const normalizedQuery = query.trim().toLowerCase();

      if (!normalizedQuery) {
        return authors;
      }

      return authors.filter((author) => author.toLowerCase().includes(normalizedQuery));
    }

    function setVisibleAuthors(authors) {
      state.authors = authors;
      state.activeSuggestion = authors.length ? Math.max(0, Math.min(state.activeSuggestion, authors.length - 1)) : -1;
    }

    function addAuthors(authors) {
      let changed = false;
      authors.forEach((author) => {
        if (author && !state.selectedAuthors.includes(author)) {
          state.selectedAuthors.push(author);
          changed = true;
        }
      });

      if (changed) {
        render();
      }
    }

    function toggleAuthor(author, selected) {
      if (selected) {
        addAuthors([author]);
        return;
      }

      state.selectedAuthors = state.selectedAuthors.filter((selectedAuthor) => selectedAuthor !== author);
      render();
    }

    function selectSuggestion(author) {
      addAuthors([author]);
      authorQuery.value = '';
      state.suggestionsOpen = false;
      state.activeSuggestion = -1;
      render();
      authorQuery.focus();
    }

    function requestAuthors(query) {
      window.clearTimeout(authorSearchTimer);
      authorSearchTimer = window.setTimeout(() => {
        vscode.postMessage({ type: 'searchAuthors', query });
      }, 160);
    }

    function setMode(mode) {
      state.mode = mode;
      state.suggestionsOpen = false;
      state.activeSuggestion = -1;
      if (mode === 'select') {
        authorQuery.value = '';
        setVisibleAuthors(state.allAuthors);
        vscode.postMessage({ type: 'searchAuthors', query: '' });
      } else {
        setVisibleAuthors(filterAuthors(state.allAuthors, authorQuery.value));
        vscode.postMessage({ type: 'searchAuthors', query: authorQuery.value });
      }
      render();
    }

    searchMode.addEventListener('change', () => setMode('search'));
    selectMode.addEventListener('change', () => setMode('select'));

    authorQuery.addEventListener('input', () => {
      state.suggestionsOpen = authorQuery.value.trim().length > 0;
      state.activeSuggestion = 0;
      setVisibleAuthors(filterAuthors(state.allAuthors, authorQuery.value));
      requestAuthors(authorQuery.value);
      render();
    });

    authorQuery.addEventListener('focus', () => {
      if (authorQuery.value.trim()) {
        state.suggestionsOpen = true;
        render();
      }
    });

    authorQuery.addEventListener('blur', () => {
      window.setTimeout(() => {
        state.suggestionsOpen = false;
        render();
      }, 120);
    });

    authorQuery.addEventListener('keydown', (event) => {
      const suggestionCount = Math.min(state.authors.length, maxSuggestions);

      if (state.suggestionsOpen && suggestionCount && event.key === 'ArrowDown') {
        event.preventDefault();
        state.activeSuggestion = (state.activeSuggestion + 1) % suggestionCount;
        render();
        return;
      }

      if (state.suggestionsOpen && suggestionCount && event.key === 'ArrowUp') {
        event.preventDefault();
        state.activeSuggestion = (state.activeSuggestion - 1 + suggestionCount) % suggestionCount;
        render();
        return;
      }

      if (event.key === 'Escape') {
        state.suggestionsOpen = false;
        render();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (state.suggestionsOpen && suggestionCount && state.activeSuggestion >= 0) {
          selectSuggestion(state.authors[state.activeSuggestion]);
          return;
        }

        addAuthors([authorQuery.value.trim()]);
        authorQuery.value = '';
        state.suggestionsOpen = false;
        render();
      }
    });

    addAllButton.addEventListener('click', () => {
      addAuthors(state.authors);
    });

    clearAuthorsButton.addEventListener('click', () => {
      state.selectedAuthors = [];
      render();
    });

    searchButton.addEventListener('click', () => {
      status.textContent = '';
      status.className = 'status';
      retryButton.hidden = true;
      if (!state.selectedAuthors.length) {
        status.textContent = l10n.noAuthorsSelected;
        return;
      }
      state.lastSearch = { authors: [...state.selectedAuthors], from: from.value, to: to.value };
      vscode.postMessage({ type: 'search', ...state.lastSearch });
    });

    retryButton.addEventListener('click', () => {
      if (state.lastSearch) {
        status.textContent = '';
        status.className = 'status';
        retryButton.hidden = true;
        vscode.postMessage({ type: 'search', ...state.lastSearch });
      }
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'authors') {
        if (state.mode === 'search' && message.query !== authorQuery.value) {
          return;
        }
        if (message.query === '') {
          state.allAuthors = message.authors;
        }
        setVisibleAuthors(message.authors);
        render();
      }
      if (message.type === 'loading') {
        state.loading = message.value;
        status.textContent = message.value ? l10n.searching : '';
        retryButton.hidden = true;
        render();
      }
      if (message.type === 'error') {
        status.textContent = message.message;
        status.className = 'status error';
        retryButton.hidden = !state.lastSearch;
      }
      if (message.type === 'result') {
        status.textContent = message.message;
        status.className = 'status';
        retryButton.hidden = true;
      }
      if (message.type === 'empty') {
        status.textContent = message.message;
        status.className = 'status';
        retryButton.hidden = true;
      }
    });

    initializeDates();
    render();
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';

  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serializeForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function isValidDateRange(from: string, to: string): boolean {
  if (!from || !to) {
    return false;
  }

  return from <= to;
}
