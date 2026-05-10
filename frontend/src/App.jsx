import { useEffect, useState } from "react";
import AppShell from "./layouts/AppShell";
import OverviewView from "./views/OverviewView";
import PlaceholderView from "./views/PlaceholderView";
import LegacyDashboardView from "./views/LegacyDashboardView";
import {
  getCryptoKeyInfo,
  getHealth,
  getModelInfo,
  getStorageRecords,
} from "./api/client";

const viewMeta = {
  "user-zone": {
    eyebrow: "User Zone",
    title: "Front-Office Document Redaction",
    subtitle:
      "Simulasi petugas atau pengguna yang mengunggah dokumen, melihat hasil sensor, dan memastikan original tidak disimpan di Operational Zone.",
  },
  "operational-zone": {
    eyebrow: "Operational Zone",
    title: "Redacted Metadata and Checking Zone",
    subtitle:
      "Zona operasional non-public yang menyimpan hasil redacted dan metadata non-private untuk kebutuhan checking.",
  },
  "sovereign-vault": {
    eyebrow: "Sovereign Vault",
    title: "Encrypted Original Storage",
    subtitle:
      "Simulasi penyimpanan original terenkripsi, DEK per upload/session, key versioning, dan public-private key lifecycle.",
  },
  "government-access": {
    eyebrow: "Government Access API",
    title: "Controlled Vault Gateway",
    subtitle:
      "Akses original hanya melalui request, approval, one-time token, dan audit log. User biasa tidak mengakses raw vault.",
  },
  "dynamic-injection": {
    eyebrow: "Dynamic Injection",
    title: "Runtime Policy Control",
    subtitle:
      "Panel untuk mengubah threshold, class policy, dan redaction mode tanpa mengubah source code dan tanpa arbitrary code execution.",
  },
  "live-stream": {
    eyebrow: "Secondary Track",
    title: "Live Stream Privacy Filter",
    subtitle:
      "Simulasi filter privasi untuk live stream seperti TikTok, YouTube, Instagram, dan OBS melalui Turbo Live pipeline.",
  },
  metrics: {
    eyebrow: "Metrics",
    title: "System Status and Demo Metrics",
    subtitle:
      "Monitoring status backend, model, vault key, latency, dan record hasil pemrosesan.",
  },
};

export default function App() {
  const [activeView, setActiveView] = useState("overview");
  const [health, setHealth] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [keyInfo, setKeyInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  async function loadStatus() {
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
    } catch (err) {
      setError("Backend belum aktif atau endpoint status belum dapat diakses.");
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

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

    if (activeView === "legacy") {
      return <LegacyDashboardView />;
    }

    const meta = viewMeta[activeView];

    return (
      <PlaceholderView
        eyebrow={meta?.eyebrow}
        title={meta?.title}
        subtitle={meta?.subtitle}
      />
    );
  }

  return (
    <AppShell
      activeView={activeView}
      onChangeView={setActiveView}
      health={health}
      keyInfo={keyInfo}
    >
      {error && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {renderView()}
    </AppShell>
  );
}
