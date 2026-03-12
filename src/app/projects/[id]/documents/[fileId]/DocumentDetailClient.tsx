"use client";

import { FileText, ArrowLeft, Download, ImageIcon, FileCheck, Share2, Printer } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";

export default function DocumentDetailClient({ projectId, file }: { projectId: string; file: any }) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (!file.url) {
            toast.error('파일 경로가 유효하지 않습니다.');
            return;
        }

        setIsDownloading(true);
        const downloadPromise = new Promise(resolve => setTimeout(resolve, 1500));

        toast.promise(downloadPromise, {
            loading: `"${file.name}" 다운로드 준비 중...`,
            success: '다운로드가 시작되었습니다.',
            error: '다운로드 실패',
        });

        await downloadPromise;
        window.open(file.url, '_blank');
        setIsDownloading(false);
    };

    return (
        <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
            <Link
                href={`/projects/${projectId}/documents`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-10"
            >
                <ArrowLeft className="w-4 h-4" /> 문서 보관함으로 돌아가기
            </Link>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Document Viewer Area (Mock) */}
                <div className="flex-1 bg-card border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col min-h-[600px]">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/30">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border/50">
                                {file.type === 'pdf' && <FileText className="w-5 h-5 text-red-500" />}
                                {file.type === 'doc' && <FileText className="w-5 h-5 text-blue-500" />}
                                {file.type === 'img' && <ImageIcon className="w-5 h-5 text-emerald-500" />}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold max-w-md truncate" title={file.name}>{file.name}</h1>
                                <p className="text-sm text-muted-foreground">{file.folder}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors tooltip tooltip-bottom" data-tip="인쇄">
                                <Printer className="w-4 h-4" />
                            </button>
                            <button className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors tooltip tooltip-bottom" data-tip="공유">
                                <Share2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-muted/30 rounded-2xl border border-border/50 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 z-10">
                            {!file.url && (
                                <p className="text-sm font-bold bg-background px-4 py-2 rounded-full border border-border/50 shadow-sm">
                                    미리보기 지원 준비 중
                                </p>
                            )}
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading || !file.url}
                                className={`px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-primary/90 flex items-center gap-2 active:scale-95 transition-all ${(isDownloading || !file.url) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} /> {file.url ? '원본 화질 다운로드' : '다운로드 불가'}
                            </button>
                        </div>

                        {/* Mock Preview Content OR Actual iframe */}
                        {file.url ? (
                            <iframe src={file.url} className="w-full h-full border-0 absolute inset-0 z-0 bg-white" title={file.name} />
                        ) : (
                            <div className="w-full h-full p-8 opacity-60 flex flex-col items-center justify-center relative z-0">
                                {file.type === 'pdf' ? (
                                    <div className="w-full max-w-sm h-full bg-background border border-border rounded shadow flex flex-col items-center pt-10">
                                        <div className="w-2/3 h-4 bg-muted mb-4 rounded" />
                                        <div className="w-5/6 h-2 bg-muted/50 mb-2 rounded" />
                                        <div className="w-5/6 h-2 bg-muted/50 mb-2 rounded" />
                                        <div className="w-4/6 h-2 bg-muted/50 rounded" />
                                    </div>
                                ) : file.type === 'img' ? (
                                    <div className="w-full max-w-md aspect-video bg-background border border-border rounded shadow-inner flex items-center justify-center">
                                        <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
                                    </div>
                                ) : (
                                    <div className="w-full max-w-sm h-full bg-background border border-border rounded shadow flex flex-col items-start p-8">
                                        <div className="w-1/2 h-6 bg-muted mb-6 rounded" />
                                        <div className="w-full h-2 bg-muted/50 mb-3 rounded" />
                                        <div className="w-full h-2 bg-muted/50 mb-3 rounded" />
                                        <div className="w-3/4 h-2 bg-muted/50 mb-8 rounded" />
                                        <div className="w-full h-2 bg-muted/50 mb-3 rounded" />
                                        <div className="w-5/6 h-2 bg-muted/50 rounded" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Details */}
                <div className="w-full lg:w-80 flex flex-col gap-6">
                    <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-foreground mb-4 pb-4 border-b border-border/30 flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-primary" /> 문서 정보
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground font-medium">크기</span>
                                <span className="font-semibold">{file.size}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground font-medium">유형</span>
                                <span className="font-semibold uppercase">{file.type} 파일</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground font-medium">업로드 날짜</span>
                                <span className="font-semibold">{file.date}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground font-medium">업로더</span>
                                <span className="font-semibold">{file.uploader}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground font-medium">버전</span>
                                <span className="font-semibold">{file.version}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className={`w-full mt-8 px-4 py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/80 flex items-center justify-center gap-2 transition-colors active:scale-95 ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} /> 파일 다운로드
                        </button>
                    </div>

                    <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-foreground mb-4 pb-4 border-b border-border/30">
                            버전 히스토리
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-sm">{file.version} (현재)</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{file.date}</div>
                                </div>
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">최신</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
