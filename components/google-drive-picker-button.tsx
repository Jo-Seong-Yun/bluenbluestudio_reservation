"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";

/**
 * 구글 드라이브 파일 선택기(Picker). 결과물 전송 확인모달에서 "다른
 * 창을 열 필요 없이" 확인모달 안에서 바로 드라이브를 훑어볼 수 있게
 * 한다. 구글 서비스 계정(시트·캘린더 연동이 쓰는)과는 다른 접근이다 —
 * 서비스 계정은 사장님 개인 드라이브와 별개 공간이라, 실제로 사람이
 * 로그인해서 자기 드라이브를 훑어보려면 OAuth 동의가 필요하다. 이
 * 컴포넌트는 그 동의(구글 로그인 팝업)와 Picker 창 띄우기를 함께
 * 처리한다. 필요한 환경변수(NEXT_PUBLIC_GOOGLE_PICKER_CLIENT_ID/
 * NEXT_PUBLIC_GOOGLE_PICKER_API_KEY)는 docs/GOOGLE_PICKER_SETUP.md 참고.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_PICKER_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export type DrivePickResult = {
  id: string;
  name: string;
  url: string;
  isFolder: boolean;
};

// 구글이 window에 꽂아주는 두 전역 — @types 패키지 없이 여기서 쓰는
// 부분만 최소한으로 타입을 적어둔다.
type GoogleTokenClient = {
  callback: (response: { access_token?: string; error?: string }) => void;
  requestAccessToken: (opts?: { prompt?: string }) => void;
};
type PickerDoc = { id: string; name: string; mimeType: string; url?: string };
type PickerData = { action: string; docs?: PickerDoc[] };
interface PickerDocsView {
  setIncludeFolders: (v: boolean) => PickerDocsView;
  setSelectFolderEnabled: (v: boolean) => PickerDocsView;
}
interface PickerInstance {
  setVisible: (v: boolean) => void;
}
interface PickerBuilderInstance {
  setOAuthToken: (token: string) => PickerBuilderInstance;
  setDeveloperKey: (key: string) => PickerBuilderInstance;
  addView: (view: PickerDocsView) => PickerBuilderInstance;
  setCallback: (cb: (data: PickerData) => void) => PickerBuilderInstance;
  build: () => PickerInstance;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: GoogleTokenClient["callback"];
          }) => GoogleTokenClient;
        };
      };
      picker: {
        Action: { PICKED: string };
        ViewId: { DOCS: string };
        DocsView: new (viewId?: string) => PickerDocsView;
        PickerBuilder: new () => PickerBuilderInstance;
      };
    };
    gapi?: { load: (api: string, callback: () => void) => void };
  }
}

const loadedScripts = new Set<string>();

function loadScript(src: string): Promise<void> {
  if (loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    script.onerror = () =>
      reject(new Error(`스크립트를 불러오지 못했습니다: ${src}`));
    document.body.appendChild(script);
  });
}

function folderUrl(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}

function fileUrl(id: string): string {
  return `https://drive.google.com/file/d/${id}/view`;
}

export function GoogleDrivePickerButton({
  onPick,
  disabled,
}: {
  onPick: (result: DrivePickResult) => void;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenClientRef = useRef<GoogleTokenClient | null>(null);
  const pickerReadyRef = useRef(false);
  const accessTokenRef = useRef<string | null>(null);

  async function ensureReady(): Promise<void> {
    await Promise.all([
      loadScript("https://accounts.google.com/gsi/client"),
      loadScript("https://apis.google.com/js/api.js"),
    ]);
    if (!pickerReadyRef.current) {
      await new Promise<void>((resolve) => {
        window.gapi!.load("picker", () => {
          pickerReadyRef.current = true;
          resolve();
        });
      });
    }
    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google!.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID!,
        scope: SCOPE,
        callback: () => {},
      });
    }
  }

  function showPicker(accessToken: string) {
    const google = window.google!;
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true);
    const picker = new google.picker.PickerBuilder()
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY!)
      .addView(view)
      .setCallback((data: PickerData) => {
        if (data.action !== google.picker.Action.PICKED) return;
        const doc = data.docs?.[0];
        if (!doc) return;
        const isFolder = doc.mimeType === "application/vnd.google-apps.folder";
        onPick({
          id: doc.id,
          name: doc.name,
          url: doc.url ?? (isFolder ? folderUrl(doc.id) : fileUrl(doc.id)),
          isFolder,
        });
      })
      .build();
    picker.setVisible(true);
  }

  function openPicker() {
    if (!CLIENT_ID || !API_KEY) {
      setError(
        "구글 드라이브 연동이 아직 설정되지 않았습니다(관리자 문의).",
      );
      return;
    }
    setError(null);
    setLoading(true);
    ensureReady()
      .then(() => {
        const tokenClient = tokenClientRef.current!;
        tokenClient.callback = (response) => {
          setLoading(false);
          if (response.error || !response.access_token) {
            setError("구글 로그인에 실패했습니다. 다시 시도해 주시기 바랍니다.");
            return;
          }
          accessTokenRef.current = response.access_token;
          showPicker(response.access_token);
        };
        // 이미 동의한 세션이면 조용히, 아니면 로그인 창을 띄운다.
        tokenClient.requestAccessToken({
          prompt: accessTokenRef.current ? "" : "consent",
        });
      })
      .catch(() => {
        setLoading(false);
        setError("구글 드라이브를 불러오지 못했습니다.");
      });
  }

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        onClick={openPicker}
        disabled={disabled || loading}
      >
        {loading ? "불러오는 중…" : "구글 드라이브에서 선택"}
      </Button>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
