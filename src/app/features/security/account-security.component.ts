import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideKeyRound,
  LucideLoaderCircle,
  LucideLogOut,
  LucideMonitorSmartphone,
  LucideShieldCheck,
  LucideX,
} from '@lucide/angular';
import { PortalApiService } from '../../core/api/portal-api.service';
import { PortalSession } from '../../domain/models/portal.models';

@Component({
  selector: 'app-account-security',
  imports: [
    CommonModule,
    FormsModule,
    LucideKeyRound,
    LucideLoaderCircle,
    LucideLogOut,
    LucideMonitorSmartphone,
    LucideShieldCheck,
    LucideX,
  ],
  templateUrl: './account-security.component.html',
  styleUrl: './account-security.component.css',
})
export class AccountSecurityComponent implements OnChanges {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() sessionEnded = new EventEmitter<void>();

  sessions: PortalSession[] = [];
  loading = false;
  actionId = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordBusy = false;
  message = '';
  error = '';

  constructor(
    private readonly api: PortalApiService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue) void this.loadSessions();
  }

  close(): void {
    if (this.passwordBusy || this.actionId) return;
    this.closed.emit();
  }

  async loadSessions(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.sessions = await this.api.sessions();
    } catch (error) {
      this.error = this.errorMessage(error, 'Active sessions could not be loaded.');
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  async revoke(session: PortalSession): Promise<void> {
    this.actionId = session.id;
    this.error = '';
    try {
      await this.api.revokeSession(session.id);
      if (session.current) {
        this.sessionEnded.emit();
        return;
      }
      await this.loadSessions();
    } catch (error) {
      this.error = this.errorMessage(error, 'The selected session could not be signed out.');
    } finally {
      this.actionId = '';
      this.changeDetector.detectChanges();
    }
  }

  async revokeOthers(): Promise<void> {
    this.actionId = 'others';
    this.error = '';
    try {
      await this.api.revokeOtherSessions();
      this.message = 'Other browser sessions were signed out.';
      await this.loadSessions();
    } catch (error) {
      this.error = this.errorMessage(error, 'Other sessions could not be signed out.');
    } finally {
      this.actionId = '';
      this.changeDetector.detectChanges();
    }
  }

  async changePassword(): Promise<void> {
    this.error = '';
    this.message = '';
    if (this.newPassword.length < 12) {
      this.error = 'New password must contain at least 12 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'New password and confirmation do not match.';
      return;
    }
    this.passwordBusy = true;
    try {
      await this.api.changePassword(this.currentPassword, this.newPassword);
      this.sessionEnded.emit();
    } catch (error) {
      this.error = this.errorMessage(error, 'Password could not be changed.');
    } finally {
      this.passwordBusy = false;
      this.changeDetector.detectChanges();
    }
  }

  private errorMessage(error: unknown, fallback: string): string {
    const value = (error as { error?: { message?: string | string[] } })?.error?.message;
    return Array.isArray(value) ? value.join(' ') : value || fallback;
  }
}
