import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectApi } from "@/api/project.api";

export function SettingsPanel({ project, onDelete, onUpdate }) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = name !== project.name || description !== (project.description || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      await ProjectApi.update(project.id, { name, description });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onUpdate) onUpdate({ ...project, name, description });
    } catch (error) {
      console.error("Failed to update project:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
  };

  return (
    <div className="space-y-6">
      {/* Edit Project */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="mb-4 text-sm font-medium text-white/60">Project Details</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-white/40">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-white/40">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving || !name.trim()}
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Project Info */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="mb-4 text-sm font-medium text-white/60">Project Information</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Project ID</span>
            <code className="rounded bg-white/[0.04] px-2 py-1 text-xs text-white/60">{project.id}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Slug</span>
            <code className="rounded bg-white/[0.04] px-2 py-1 text-xs text-white/60">{project.slug}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Created</span>
            <span className="text-sm text-white/60">{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-500/20 bg-red-500/[0.02] p-4">
        <h3 className="mb-2 text-sm font-medium text-red-400">Danger Zone</h3>
        <p className="mb-4 text-sm text-white/40">
          Deleting this project will permanently remove all events, channels, and API keys.
        </p>

        {!showDelete ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDelete(true)}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            Delete Project
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              Type <strong className="text-white">{project.name}</strong> to confirm:
            </p>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={project.name}
              className="border-red-500/20"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDelete(false);
                  setConfirmName("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={confirmName !== project.name || deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? "Deleting..." : "Delete Project"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
