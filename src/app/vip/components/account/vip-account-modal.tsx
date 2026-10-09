
"use client";

import {
  type MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import styles from "./vip-account-modal.module.css";

type ChangeLimit = {
  canChange: boolean;
  nextChangeAt: string | null;
};

type AccountLimits = {
  username: ChangeLimit;
  password: ChangeLimit;
};

type VipAccountModalProps = {
  open: boolean;
  accountName?: string;
  accountEmail: string;
  membershipExpiresAt: string;
  initialLimits?: AccountLimits;
  initialHasPassword?: boolean;
  telegramLinked: boolean;
  telegramUsername: string | null;
  onLimitsChange?: (limits: AccountLimits) => void;
  onAccountNameChange?: (accountName: string) => void;
  onClose: () => void;
};

function formatExpirationDate(value: string) {
  if (!value) return "No disponible";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No disponible";

  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m4.5 8 3.2 3.1L12 5.6l4.3 5.5L19.5 8l-1.2 9H5.7L4.5 8Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 19h11.6"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.67 3.44 2.93 10.28c-1.21.49-1.2 1.17-.22 1.47l4.55 1.42 1.75 5.36c.21.58.1.81.72.81.48 0 .69-.22.96-.48l2.19-2.13 4.56 3.37c.84.46 1.44.22 1.65-.78L22.08 5.2c.31-1.24-.47-1.8-1.41-1.76ZM8.01 12.84l10.54-6.65c.53-.32 1.01-.15.61.21l-8.7 7.86-.34 3.61-2.11-5.03Z"
      />
    </svg>
  );
}

export function VipAccountModal({
  open,
  accountEmail,
  membershipExpiresAt,
  telegramLinked,
  telegramUsername,
  onClose,
}: VipAccountModalProps) {
  const [telegramMaintenance, setTelegramMaintenance] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const expirationDate = useMemo(
    () => formatExpirationDate(membershipExpiresAt),
    [membershipExpiresAt]
  );

  useEffect(() => {
    let active = true;

    const loadMaintenanceState = async () => {
      const { data, error } = await supabase
        .from("telegram_service_state")
        .select("maintenance")
        .eq("id", 1)
        .maybeSingle();

      if (!active || error) return;
      setTelegramMaintenance(data?.maintenance === true);
    };

    void loadMaintenanceState();

    const channel = supabase
      .channel("vip-account-telegram-service-state")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "telegram_service_state",
          filter: "id=eq.1",
        },
        (payload) => {
          const nextState = payload.new as {
            maintenance?: boolean;
          };

          setTelegramMaintenance(nextState.maintenance === true);
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const cleanTelegramUsername =
    telegramUsername?.trim().replace(/^@/, "") || "";

  const telegramTitle = telegramMaintenance
    ? "Telegram en mantenimiento"
    : telegramLinked
      ? "Cuenta vinculada"
      : "Telegram no vinculado";

  const telegramDescription = telegramMaintenance
    ? "Temporalmente no disponible."
    : telegramLinked
      ? cleanTelegramUsername
        ? `@${cleanTelegramUsername}`
        : "Cuenta de Telegram vinculada."
      : "Aún no has vinculado una cuenta.";

  return createPortal(
    <div
      className={styles.modalLayer}
      onMouseDown={handleBackdropClick}
    >
      <div
        className={styles.accountModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vip-account-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Cerrar Mi cuenta"
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        <header className={styles.modalHeading}>
          <h2 id="vip-account-title" className={styles.modalTitle}>
            Mi cuenta
          </h2>
          <p className={styles.modalDescription}>
            Administra tu información y configuración de cuenta.
          </p>
        </header>

        <div className={styles.profileSummary}>
          <div className={styles.profileAvatar} aria-hidden="true">
            M
          </div>

          <div className={styles.profileIdentity}>
            <p className={styles.profileName} title="Miembro VIP">
              Miembro VIP
            </p>
            <p className={styles.profileEmail} title={accountEmail}>
              {accountEmail}
            </p>
            <span className={styles.activeBadge}>
              <span className={styles.activePoint} aria-hidden="true" />
              VIP Activo
            </span>
          </div>
        </div>

        <div className={styles.sectionDivider} aria-hidden="true" />

        <section className={styles.modalSection}>
          <h3 className={styles.sectionTitle}>Tu membresía</h3>
          <div className={styles.membershipCard}>
            <div className={styles.membershipIcon} aria-hidden="true">
              <CrownIcon />
            </div>
            <div className={styles.membershipDetails}>
              <p className={styles.membershipName}>Plan VIP</p>
              <p className={styles.membershipDescription}>
                Acceso completo a todos los beneficios.
              </p>
            </div>
            <div className={styles.expirationDetails}>
              <span>Vence el</span>
              <strong>{expirationDate}</strong>
            </div>
          </div>
        </section>

        <div className={styles.sectionDivider} aria-hidden="true" />

        <section className={styles.modalSection}>
          <h3 className={styles.sectionTitle}>Telegram</h3>
          <div className={styles.accountActions}>
            <div
              className={styles.actionButton}
              style={{
                cursor: "default",
                pointerEvents: "none",
              }}
              aria-label={telegramTitle}
            >
              <span className={styles.actionIcon} aria-hidden="true">
                <TelegramIcon />
              </span>
              <span className={styles.actionText}>
                <strong>{telegramTitle}</strong>
                <small>{telegramDescription}</small>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body
  );
}
