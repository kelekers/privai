import { useCallback, useEffect, useState } from "react";
import AppShell from "./layouts/AppShell";
import DynamicInjectionView from "./views/DynamicInjectionView";
import GovernmentAccessView from "./views/GovernmentAccessView";
import LiveStreamView from "./views/LiveStreamView";
import MetricsView from "./views/MetricsView";
import AuditLogView from "./views/AuditLogView";
import OperationalZoneView from "./views/OperationalZoneView";
import OverviewView from "./views/OverviewView";
import PlaceholderView from "./views/PlaceholderView";
import SovereignVaultView from "./views/SovereignVaultView";
import UserZoneView from "./views/UserZoneView";
import {
  getCryptoKeyInfo,
  getHealth,
  getModelInfo,
  getStorageRecords,
} from "./api/client";

export default function App() {
  const [activeView, setActiveView] = useState("overview");
  const [health, setHealth] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [keyInfo, setKeyInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const [healthData, modelData, keyData, recordsData] = await Promise.all([
        getHealth(),
        getModelInfo(),
        getCryptoKeyInfo(),
        getStorageRecords(),
      ]);

      setHealth(healthData);
      setModelInfo(modelData);
      setKeyInfo(keyData);
      setRecords(recordsData.records || []);
      setError("");
    } catch {
      setError("Backend belum aktif atau endpoint status belum dapat diakses.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadStatus, 0);
    return () => window.clearTimeout(timer);
  }, [loadStatus]);

  const latestRecordId = records?.[0]?.record_id || "";

  function renderView() {
    if (activeView === "overview") {
      return (
        <OverviewView
          onNavigate={setActiveView}
          health={health}
          modelInfo={modelInfo}
          keyInfo={keyInfo}
          records={records}
        />
      );
    }

    switch (activeView) {
      case "user-zone":
        return <UserZoneView onRefreshStatus={loadStatus} />;
      case "operational-zone":
        return <OperationalZoneView records={records} />;
      case "sovereign-vault":
        return <SovereignVaultView keyInfo={keyInfo} records={records} />;
      case "government-access":
        return <GovernmentAccessView latestRecordId={latestRecordId} />;
      case "dynamic-injection":
        return <DynamicInjectionView onNavigate={setActiveView} />;
      case "live-stream":
        return <LiveStreamView />;
      case "audit-log":
        return <AuditLogView />;
      case "metrics":
        return (
          <MetricsView
            health={health}
            modelInfo={modelInfo}
            keyInfo={keyInfo}
            records={records}
            onRefreshStatus={loadStatus}
          />
        );
      default:
        return (
          <PlaceholderView
            eyebrow="Navigation"
            title="View tidak dikenal"
            subtitle="Pilih salah satu role-based view dari sidebar untuk melanjutkan demo."
          />
        );
    }
  }

  return (
    <AppShell
      activeView={activeView}
      onChangeView={setActiveView}
      health={health}
      keyInfo={keyInfo}
    >
      {error && (
        <div className="mb-4 rounded-[1.15rem] border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {renderView()}
    </AppShell>
  );
}
