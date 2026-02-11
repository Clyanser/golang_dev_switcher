import { useState, useEffect } from 'react';
import { ListVersions, SwitchVersion, InstallVersion, FetchRemoteVersions, UninstallVersion } from "../wailsjs/go/main/App";
import { EventsOn } from "../wailsjs/runtime/runtime";

// Icons
const IconBox = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /><line x1="3.27 16.96" x2="12 12.01" /><line x1="20.73 16.96" x2="12 12.01" /></svg>;
const IconCloud = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>;
const IconDownload = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>;

function App() {
    const [activeTab, setActiveTab] = useState('installed');
    const [installedVersions, setInstalledVersions] = useState([]);
    const [remoteVersions, setRemoteVersions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentVersion, setCurrentVersion] = useState('');
    const [downloadState, setDownloadState] = useState({ version: '', progress: 0 });

    useEffect(() => {
        refreshInstalled();
        const unsubscribe = EventsOn("download_progress", (data) => {
            if (data && data.version) {
                setDownloadState({ version: data.version, progress: data.progress });
            }
        });
        return () => { };
    }, []);

    const refreshInstalled = () => {
        ListVersions().then((versions) => {
            const list = versions || [];
            setInstalledVersions(list);
            const active = list.find(v => v.active);
            if (active) setCurrentVersion(active.version);
        });
    };

    const loadRemote = () => {
        if (remoteVersions.length > 0) return;
        setLoading(true);
        FetchRemoteVersions().then((releases) => {
            setRemoteVersions(releases || []);
        }).finally(() => setLoading(false));
    };

    const handleSwitch = (v) => {
        const target = v.path;
        setStatus(`Switching to ${v.version}...`);
        SwitchVersion(target).then((result) => {
            setStatus(result === "Success" ? "Ready" : result);
            refreshInstalled();
            setTimeout(() => setStatus(''), 3000);
        });
    };

    const handleInstall = (version) => {
        if (downloadState.version && downloadState.version !== version) {
            setStatus("Another download in progress...");
            return;
        }
        setDownloadState({ version: version, progress: 0 });
        setStatus(`Downloading ${version}...`);

        InstallVersion(version).then((result) => {
            setStatus(result);
            setDownloadState({ version: '', progress: 0 });
            refreshInstalled();
            if (result === "Success") {
                setActiveTab('installed');
            }
        }).catch(err => {
            setStatus(`Error: ${err}`);
            setDownloadState({ version: '', progress: 0 });
        });
    };

    const handleUninstall = (v) => {
        if (v.active) return;
        if (!confirm(`Are you sure you want to uninstall ${v.version}?`)) return;

        setStatus(`Uninstalling ${v.version}...`);
        UninstallVersion(v.version).then((result) => {
            setStatus(result);
            refreshInstalled();
            setTimeout(() => setStatus(''), 3000);
        });
    }

    const filteredRemote = remoteVersions.filter(r => r.version.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="flex h-screen bg-[#050505] text-[#EDEDED] font-sans selection:bg-[#0070F3]/30 overflow-hidden">
            {/* Sidebar */}
            <div className="w-[260px] bg-[#0A0A0A] border-r border-[#222] flex flex-col pt-6 pb-6 px-4 shrink-0 transition-all duration-300">
                <div className="flex items-center gap-3 px-3 pb-8">
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#0070F3] to-[#00C851] flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(0,112,243,0.15)] select-none">
                        G
                    </div>
                    <span className="text-[18px] font-semibold tracking-tight text-white/90">GoSwitch</span>
                </div>

                <nav className="space-y-1">
                    <button
                        onClick={() => setActiveTab('installed')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'installed' ? 'bg-[#111] text-white shadow-[0_1px_0_#222] ring-1 ring-[#222]' : 'text-[#888] hover:bg-[#111] hover:text-[#EDEDED]'}`}
                    >
                        <IconBox /> 本地环境 (Local)
                    </button>
                    <button
                        onClick={() => { setActiveTab('available'); loadRemote(); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'available' ? 'bg-[#111] text-white shadow-[0_1px_0_#222] ring-1 ring-[#222]' : 'text-[#888] hover:bg-[#111] hover:text-[#EDEDED]'}`}
                    >
                        <IconCloud /> 下载中心 (Remote)
                    </button>
                </nav>

                <div className="flex-1"></div>

                {/* Status Footer */}
                <div className="p-3 bg-[#111] border border-[#222] rounded-lg">
                    <div className="text-[10px] text-[#666] font-bold mb-1.5 uppercase tracking-wide">System Status</div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status ? 'bg-[#FBBC04] shadow-[0_0_8px_#FBBC04]' : 'bg-[#00C851] shadow-[0_0_8px_#00C851]'}`}></div>
                        <div className="text-[13px] font-semibold text-white truncate w-full" title={status || currentVersion || "Ready"}>
                            {status || (currentVersion ? `Active: ${currentVersion}` : "Ready")}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-[#050505]">
                {/* Header */}
                <header className="h-[72px] border-b border-[#222] flex items-center justify-between px-8 bg-[#050505] shrink-0 drag-region">
                    <div className="text-[16px] font-semibold text-[#EDEDED] flex items-center gap-2">
                        {activeTab === 'installed' ? '已安装版本 (Installed)' : '版本库 (All Releases)'}
                        {loading && <div className="w-3 h-3 border-2 border-[#0070F3] border-t-transparent rounded-full animate-spin ml-2"></div>}
                    </div>

                    {activeTab === 'available' && (
                        <div className="no-drag">
                            <input
                                type="text"
                                placeholder="Filter versions..."
                                className="bg-[#111] border border-[#222] rounded-md px-3 py-1.5 w-[240px] text-[13px] text-[#EDEDED] placeholder-[#666] outline-none focus:border-[#333] transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* List Header */}
                    <div className="grid grid-cols-12 gap-4 px-5 pb-3 border-b border-[#222] mb-2 text-[#666] text-[12px] font-semibold uppercase tracking-wider select-none">
                        <div className="col-span-3">Version</div>
                        <div className="col-span-6 pl-2">Location/Status</div>
                        <div className="col-span-3 text-right">Action</div>
                    </div>

                    <div className="space-y-2">
                        {activeTab === 'installed' && installedVersions.map((v) => (
                            <div
                                key={v.path}
                                className={`group grid grid-cols-12 gap-4 items-center px-5 py-4 rounded-xl border transition-all duration-200 cursor-default ${v.active ? 'bg-[#0070F3]/[0.03] border-[#0070F3]/30 shadow-[0_0_0_1px_rgba(0,112,243,0.1)]' : 'bg-[#111] border-[#222] hover:bg-[#161616] hover:border-[#333] hover:translate-y-[-1px] hover:shadow-lg'}`}
                            >
                                <div className="col-span-3 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[10px] border ${v.active ? 'bg-[#0070F3] text-white border-[#0070F3]' : 'bg-[#111] text-[#666] border-[#222]'}`}>
                                        GO
                                    </div>
                                    <span className="font-semibold text-[15px] text-[#EDEDED]">{v.version}</span>
                                </div>

                                <div className="col-span-6 pl-2">
                                    <div className="font-mono text-[12px] text-[#666] truncate group-hover:text-[#888] transition-colors" title={v.path}>
                                        {v.path}
                                    </div>
                                </div>

                                <div className="col-span-3 text-right flex justify-end gap-2">
                                    {v.active ? (
                                        <button className="px-4 py-1.5 rounded-md text-[13px] font-medium text-[#00C851] bg-transparent cursor-default border border-transparent">
                                            Currently Used
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleSwitch(v)}
                                                className="px-4 py-1.5 rounded-md border border-[#222] text-[#EDEDED] text-[13px] font-medium hover:bg-white hover:text-black hover:border-white transition-all bg-transparent"
                                            >
                                                Switch
                                            </button>

                                            {/* Only show uninstall for managed versions (in .goswitch) */}
                                            {v.path.includes(".goswitch") && (
                                                <button
                                                    onClick={() => handleUninstall(v)}
                                                    className="p-1 rounded-md border border-[#222] text-[#666] hover:bg-[#220000] hover:text-[#ff4444] hover:border-[#ff4444] transition-all bg-transparent flex items-center justify-center w-8 h-8"
                                                    title="Uninstall"
                                                >
                                                    <IconTrash />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {activeTab === 'installed' && installedVersions.length === 0 && (
                            <div className="text-center py-20 text-[#666] text-sm">
                                暂无安装的版本 (No installed versions found)
                            </div>
                        )}

                        {activeTab === 'available' && filteredRemote.map((release) => (
                            <div
                                key={release.version}
                                className="group grid grid-cols-12 gap-4 items-center px-5 py-3 rounded-lg bg-[#111] border border-[#222] hover:bg-[#161616] hover:border-[#333] transition-all duration-200"
                            >
                                <div className="col-span-3 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[10px] border bg-[#111] border-[#222] text-[#666] group-hover:text-[#EDEDED] transition-colors`}>
                                        DL
                                    </div>
                                    <span className="font-mono text-[14px] font-semibold text-[#EDEDED]">{release.version}</span>
                                </div>

                                <div className="col-span-6 pl-2">
                                    {downloadState.version === release.version ? (
                                        <div className="w-full max-w-[200px]">
                                            <div className="flex justify-between text-[10px] text-[#0070F3] mb-1 font-mono">
                                                <span>Downloading...</span>
                                                <span>{downloadState.progress}%</span>
                                            </div>
                                            <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#0070F3] transition-all duration-300 ease-out"
                                                    style={{ width: `${downloadState.progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-[100px] text-[11px] font-semibold border ${release.version.includes('rc') || release.version.includes('beta') ? 'bg-[#FBBC04]/10 text-[#FBBC04] border-[#FBBC04]/20' : 'bg-[#00C851]/10 text-[#00C851] border-[#00C851]/20'}`}>
                                            {release.version.includes('rc') || release.version.includes('beta') ? 'Beta / RC' : 'Stable'}
                                        </span>
                                    )}
                                </div>

                                <div className="col-span-3 text-right">
                                    {downloadState.version === release.version ? (
                                        <button disabled className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[#0070F3] text-[12px] font-medium bg-transparent cursor-default opacity-80">
                                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            {downloadState.progress}%
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleInstall(release.version)}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#222] text-[#888] text-[12px] font-medium hover:bg-white hover:text-black hover:border-white transition-all bg-transparent group-hover:text-[#EDEDED]"
                                        >
                                            <IconDownload /> Download
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default App;
