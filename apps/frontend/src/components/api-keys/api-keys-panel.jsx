import { useState, useEffect } from "react";
import ApiKeyApi from "@/api/apiKey.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ApiKeyRow({ apiKey, onRevoke, onDelete }) {
  const [copied, setCopied] = useState(false);

  const copyPreview = () => {
    navigator.clipboard.writeText(apiKey.keyPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.04]">
          <svg className="h-4 w-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{apiKey.name}</span>
            {!apiKey.isActive && (
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                revoked
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs text-white/30">{apiKey.keyPreview}</code>
            <button
              onClick={copyPreview}
              className="text-[10px] text-white/20 hover:text-white/60"
            >
              {copied ? "copied" : "copy"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/30">{apiKey.usageCount} requests</span>
        {apiKey.isActive ? (
          <button
            onClick={() => onRevoke(apiKey.id)}
            className="rounded px-2 py-1 text-xs text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            Revoke
          </button>
        ) : (
          <button
            onClick={() => onDelete(apiKey.id)}
            className="rounded px-2 py-1 text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/60"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function CreateApiKeyDialog({ open, onOpenChange, projectId, onCreated }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdKey, setCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await ApiKeyApi.create(projectId, { name });
      setCreatedKey(data.rawKey);
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create API key");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setCreatedKey(null);
    setError("");
    setCopied(false);
    onOpenChange(false);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Copy your API key now. You won't be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="rounded-lg border border-white/10 bg-black p-4">
                <code className="break-all text-sm text-green-400">{createdKey}</code>
              </div>
              <Button className="mt-4 w-full" onClick={copyKey}>
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key to authenticate requests.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Name</Label>
                <Input
                  id="keyName"
                  placeholder="Production"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ApiKeysPanel({ projectId }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchApiKeys = async () => {
    try {
      const { data } = await ApiKeyApi.list(projectId);
      setApiKeys(data.apiKeys || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [projectId]);

  const handleRevoke = async (keyId) => {
    try {
      await ApiKeyApi.revoke(projectId, keyId);
      fetchApiKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (keyId) => {
    try {
      await ApiKeyApi.delete(projectId, keyId);
      fetchApiKeys();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">{apiKeys.length} API key{apiKeys.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          New Key
        </Button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-16">
          <div className="mb-4 rounded-full bg-white/[0.04] p-4">
            <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h3 className="mb-1 font-medium text-white/60">No API keys</h3>
          <p className="mb-4 text-sm text-white/30">Create an API key to start sending events</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Create API Key
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
          {apiKeys.map((apiKey) => (
            <ApiKeyRow
              key={apiKey.id}
              apiKey={apiKey}
              onRevoke={handleRevoke}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreateApiKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        onCreated={fetchApiKeys}
      />
    </div>
  );
}
