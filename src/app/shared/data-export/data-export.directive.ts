import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appDataExport]',
  standalone: true,
})
export class DataExportDirective implements AfterViewInit, OnDestroy {
  @Input('appDataExport') exportTitle = '';

  private toolbar?: HTMLElement;
  private dialog?: HTMLElement;
  private observer?: MutationObserver;
  private exportButton?: HTMLButtonElement;
  private removeDialogKeyListener?: () => void;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  ngAfterViewInit(): void {
    queueMicrotask(() => this.mountToolbar());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.closeFormatDialog(false);
    this.toolbar?.remove();
  }

  private mountToolbar(): void {
    const host = this.elementRef.nativeElement;
    const anchor = host instanceof HTMLTableElement && host.parentElement?.className.includes('scroll')
      ? host.parentElement
      : host;
    const explicitTarget = host.closest<HTMLElement>('section, article, [role="dialog"]')
      ?.querySelector<HTMLElement>('[data-export-target]');
    const previousSibling = anchor.previousElementSibling;
    const adjacentHeader = previousSibling instanceof HTMLElement && previousSibling.tagName === 'HEADER'
      ? previousSibling
      : null;
    const target = explicitTarget ?? adjacentHeader;
    const parent = target ?? anchor.parentNode;
    if (!parent || this.toolbar) return;

    const toolbar = this.renderer.createElement('div') as HTMLElement;
    toolbar.className = 'data-export-toolbar';
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', `Export ${this.title()}`);

    this.exportButton = this.createButton();
    this.exportButton.setAttribute('aria-haspopup', 'dialog');
    toolbar.append(this.exportButton);
    if (target) {
      toolbar.classList.add('data-export-toolbar--inline');
      this.renderer.appendChild(target, toolbar);
    } else {
      this.renderer.insertBefore(parent, toolbar, anchor);
    }
    this.toolbar = toolbar;

    this.observer = new MutationObserver(() => this.updateAvailability());
    this.observer.observe(host, { childList: true, subtree: true, characterData: true });
    this.updateAvailability();
  }

  private createButton(): HTMLButtonElement {
    const button = this.renderer.createElement('button') as HTMLButtonElement;
    button.type = 'button';
    button.className = 'data-export-button data-export-button--trigger';
    button.textContent = 'Export';
    button.setAttribute('aria-label', `Export ${this.title()}`);
    button.title = `Export ${this.title()}`;
    this.renderer.listen(button, 'click', () => this.openFormatDialog());
    return button;
  }

  private async runExport(format: 'csv' | 'pdf'): Promise<void> {
    const button = this.exportButton;
    if (!button) return;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      await (format === 'csv' ? this.exportCsv() : this.exportPdf());
    } catch (error) {
      window.alert(`The export could not be saved. ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      button.removeAttribute('aria-busy');
      this.updateAvailability();
    }
  }

  private updateAvailability(): void {
    const hasData = this.tableRows().length > 1;
    if (this.exportButton) this.exportButton.disabled = !hasData;
  }

  private openFormatDialog(): void {
    if (this.dialog || this.exportButton?.disabled) return;
    const title = this.title();
    const headingId = `data-export-dialog-${Math.random().toString(36).slice(2)}`;
    const backdrop = this.renderer.createElement('div') as HTMLElement;
    backdrop.className = 'data-export-dialog-backdrop';
    const panel = this.renderer.createElement('section') as HTMLElement;
    panel.className = 'data-export-dialog';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', headingId);

    const header = this.renderer.createElement('div') as HTMLElement;
    header.className = 'data-export-dialog-header';
    const headingWrap = this.renderer.createElement('div') as HTMLElement;
    const heading = this.renderer.createElement('h2') as HTMLElement;
    heading.id = headingId;
    heading.textContent = `Export ${title}`;
    const copy = this.renderer.createElement('p') as HTMLElement;
    copy.textContent = 'Choose a file format. A Save As dialog will open next.';
    headingWrap.append(heading, copy);
    const close = this.renderer.createElement('button') as HTMLButtonElement;
    close.type = 'button';
    close.className = 'data-export-dialog-close';
    close.setAttribute('aria-label', 'Close export dialog');
    close.textContent = '×';
    this.renderer.listen(close, 'click', () => this.closeFormatDialog());
    header.append(headingWrap, close);

    const options = this.renderer.createElement('div') as HTMLElement;
    options.className = 'data-export-dialog-options';
    for (const format of ['csv', 'pdf'] as const) {
      const option = this.renderer.createElement('button') as HTMLButtonElement;
      option.type = 'button';
      option.className = 'data-export-format-option';
      option.innerHTML = `<strong>${format.toUpperCase()}</strong><span>${format === 'csv' ? 'Spreadsheet data' : 'Printable document'}</span>`;
      option.setAttribute('aria-label', `Export ${title} as ${format.toUpperCase()}`);
      this.renderer.listen(option, 'click', () => {
        this.closeFormatDialog(false);
        void this.runExport(format);
      });
      options.append(option);
    }

    const footer = this.renderer.createElement('div') as HTMLElement;
    footer.className = 'data-export-dialog-footer';
    const cancel = this.renderer.createElement('button') as HTMLButtonElement;
    cancel.type = 'button';
    cancel.className = 'data-export-dialog-cancel';
    cancel.textContent = 'Cancel';
    this.renderer.listen(cancel, 'click', () => this.closeFormatDialog());
    footer.append(cancel);
    panel.append(header, options, footer);
    backdrop.append(panel);
    this.renderer.listen(backdrop, 'click', (event: MouseEvent) => {
      if (event.target === backdrop) this.closeFormatDialog();
    });
    this.renderer.appendChild(document.body, backdrop);
    document.body.classList.add('data-export-dialog-open');
    this.dialog = backdrop;
    this.removeDialogKeyListener = this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeFormatDialog();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });
    requestAnimationFrame(() => options.querySelector<HTMLButtonElement>('button')?.focus());
  }

  private closeFormatDialog(restoreFocus = true): void {
    this.removeDialogKeyListener?.();
    this.removeDialogKeyListener = undefined;
    this.dialog?.remove();
    this.dialog = undefined;
    document.body.classList.remove('data-export-dialog-open');
    if (restoreFocus) this.exportButton?.focus();
  }

  private async exportCsv(): Promise<void> {
    const rows = this.tableRows();
    if (rows.length < 2) return;
    const destination = await this.prepareSave(`${this.filename()}.csv`);
    if (!destination) return;

    const csv = rows
      .map((row) => row.map((cell) => this.csvCell(cell)).join(','))
      .join('\r\n');
    await destination(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  }

  private async exportPdf(): Promise<void> {
    const rows = this.tableRows();
    if (rows.length < 2) return;
    // Request the destination before lazy imports consume the browser's click activation.
    const destination = await this.prepareSave(`${this.filename()}.pdf`);
    if (!destination) return;

    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const landscape = rows[0].length > 5;
    const document = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
    document.setProperties({ title: this.title(), creator: 'POS V2' });
    document.setFont('helvetica', 'bold');
    document.setFontSize(15);
    document.text(this.title(), 36, 36);
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.setTextColor(95, 105, 120);
    document.text(`Exported ${new Date().toLocaleString()}`, 36, 51);

    autoTable(document, {
      head: [rows[0]],
      body: rows.slice(1),
      startY: 62,
      margin: { left: 28, right: 28, bottom: 28 },
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: landscape ? 6.5 : 7.5,
        cellPadding: 4,
        overflow: 'linebreak',
        textColor: [31, 41, 55],
        lineColor: [218, 223, 230],
        lineWidth: 0.35,
      },
      headStyles: {
        fillColor: [31, 78, 61],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [247, 249, 248] },
    });

    await destination(document.output('blob'));
  }

  private tableRows(): string[][] {
    const host = this.elementRef.nativeElement;
    if (host instanceof HTMLTableElement) {
      const rows = Array.from(host.rows)
        .filter((row) => this.isVisible(row))
        .map((row) =>
          Array.from(row.cells).flatMap((cell) => {
            if (!this.isExportableCell(cell, row.parentElement?.tagName === 'THEAD')) return [];
            return Array.from({ length: cell.colSpan }, () => this.cellText(cell));
          }),
        )
        .filter((row) => row.length > 0);
      return this.normalizeRows(rows);
    }

    const header = host.querySelector<HTMLElement>('[data-export-header]') ??
      Array.from(host.querySelectorAll<HTMLElement>('[class]')).find((element) =>
        Array.from(element.classList).some((name) => name.endsWith('-head') && !name.includes('group-head')),
      );
    let bodyRows = Array.from(host.querySelectorAll<HTMLElement>('[data-export-row]'));
    if (!bodyRows.length) {
      const inferredRows = Array.from(host.querySelectorAll<HTMLElement>('[class]')).filter((element) =>
        Array.from(element.classList).some((name) => name.endsWith('-row')),
      );
      bodyRows = inferredRows.filter((row) => !inferredRows.some((candidate) => candidate !== row && candidate.contains(row)));
    }
    if (!bodyRows.length && header?.parentElement === host) {
      bodyRows = Array.from(host.children).filter(
        (element): element is HTMLElement => element instanceof HTMLElement && element !== header,
      );
    }
    const rows = [header, ...bodyRows]
      .filter((row): row is HTMLElement => Boolean(row) && this.isVisible(row as HTMLElement))
      .map((row) =>
        Array.from(row.children)
          .filter((cell) => this.isExportableCell(cell as HTMLElement, row === header))
          .map((cell) => this.cellText(cell as HTMLElement)),
      )
      .filter((row) => row.length > 0);
    return this.normalizeRows(rows);
  }

  private isExportableCell(element: HTMLElement, header: boolean): boolean {
    if (element.hasAttribute('data-export-ignore') || !this.isVisible(element)) return false;
    if (header) return true;
    if (element.matches('button')) return false;
    const children = Array.from(element.children).filter((child) => child.tagName !== 'NG-TEMPLATE');
    return !children.length || !children.every((child) => child.matches('button, a'));
  }

  private cellText(element: HTMLElement): string {
    const formValues = Array.from(element.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select'))
      .map((control) => control instanceof HTMLInputElement && control.type === 'checkbox'
        ? (control.checked ? 'Yes' : 'No')
        : control.value)
      .filter(Boolean);
    return this.cleanText([element.textContent, ...formValues].filter(Boolean).join(' '));
  }

  private normalizeRows(rows: string[][]): string[][] {
    const width = Math.max(0, ...rows.map((row) => row.length));
    return rows.map((row) => [...row, ...Array(Math.max(0, width - row.length)).fill('')]);
  }

  private isVisible(element: HTMLElement): boolean {
    return getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden';
  }

  private cleanText(value: string | null): string {
    return (value ?? '').replace(/\s+/g, ' ').trim();
  }

  private csvCell(value: string): string {
    const protectedValue = /^[=+@]/.test(value) || /^-\D/.test(value) ? `'${value}` : value;
    return `"${protectedValue.replace(/"/g, '""')}"`;
  }

  private title(): string {
    if (this.exportTitle.trim()) return this.exportTitle.trim();
    const host = this.elementRef.nativeElement;
    const caption = host.querySelector('caption')?.textContent?.trim();
    if (caption) return caption;
    const region = host.closest('section, article, [role="dialog"]');
    return region?.querySelector('h1, h2, h3')?.textContent?.trim() || 'Table data';
  }

  private filename(): string {
    const slug = this.title()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'table-data';
    const date = new Date().toISOString().slice(0, 10);
    return `${slug}-${date}`;
  }

  private async prepareSave(filename: string): Promise<((blob: Blob) => Promise<void>) | null> {
    const pickerWindow = window as unknown as Window & {
      showSaveFilePicker?: (options: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>;
    };
    if (pickerWindow.showSaveFilePicker) {
      try {
        const extension = filename.endsWith('.pdf') ? '.pdf' : '.csv';
        const mimeType = extension === '.pdf' ? 'application/pdf' : 'text/csv';
        const handle = await pickerWindow.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: `${extension.slice(1).toUpperCase()} file`, accept: { [mimeType]: [extension] } }],
        });
        return async (blob: Blob) => {
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        };
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return null;
        // If the picker exists but is unavailable in this browser context,
        // continue with the filename prompt and regular download fallback.
      }
    }

    const requestedName = window.prompt('Save export as', filename)?.trim();
    if (!requestedName) return null;
    const extension = filename.endsWith('.pdf') ? '.pdf' : '.csv';
    const downloadName = requestedName.toLowerCase().endsWith(extension)
      ? requestedName
      : `${requestedName}${extension}`;
    return async (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url));
    };
  }
}
