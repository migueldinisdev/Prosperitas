import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Plus, Trash2, Edit2 } from "lucide-react";
import type { Category } from "../core/schema-types";
import { generateUniqueId } from "../utils/id";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectCategories } from "../store/selectors";
import {
    addCategory,
    removeCategory,
    updateCategory,
} from "../store/slices/categoriesSlice";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const availableColors = [
    "#ef4444", // red
    "#f59e0b", // orange
    "#eab308", // yellow
    "#10b981", // emerald
    "#06b6d4", // cyan
    "#d61544", // primary
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#6366f1", // indigo
    "#14b8a6", // teal
];

export const ManageCategoriesModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const dispatch = useAppDispatch();
    const categoriesMap = useAppSelector(selectCategories);
    const categories = useMemo(
        () =>
            Object.values(categoriesMap).sort((a, b) =>
                a.name.localeCompare(b.name)
            ),
        [categoriesMap]
    );
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [formName, setFormName] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formColor, setFormColor] = useState("#10b981");
    const [formType, setFormType] = useState<Category["type"]>("expense");

    const resetForm = () => {
        setFormName("");
        setFormDescription("");
        setFormColor("#10b981");
        setFormType("expense");
        setIsAdding(false);
        setEditingId(null);
    };

    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    const handleAdd = () => {
        if (!formName.trim()) return;

        const newCategory: Category = {
            id: generateUniqueId("cat_"),
            name: formName,
            description: formDescription.trim(),
            color: formColor,
            type: formType,
        };

        dispatch(addCategory(newCategory));
        resetForm();
    };

    const handleEdit = (category: Category) => {
        setEditingId(category.id);
        setFormName(category.name);
        setFormDescription(category.description ?? "");
        setFormColor(category.color);
        setFormType(category.type);
        setIsAdding(false);
    };

    const handleUpdate = () => {
        if (!formName.trim() || !editingId) return;

        dispatch(
            updateCategory({
                id: editingId,
                changes: {
                    name: formName,
                    description: (formDescription ?? "").trim(),
                    color: formColor,
                    type: formType,
                },
            })
        );
        resetForm();
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this category?")) {
            dispatch(removeCategory(id));
            if (editingId === id) resetForm();
        }
    };

    const startAdding = () => {
        resetForm();
        setIsAdding(true);
    };

    // no icon selection; categories are represented by name + color

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories">
            <div className="space-y-4">
                {/* Categories List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {categories.length === 0 ? (
                        <p className="text-sm text-app-muted">
                            No categories yet. Add one to get started.
                        </p>
                    ) : (
                        categories.map((category) => {
                            return (
                                <div
                                    key={category.id}
                                    className="flex items-center justify-between p-3 bg-app-surface rounded-lg border border-app-border hover:border-app-primary/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                                            style={{
                                                backgroundColor: `${category.color}20`,
                                            }}
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-app-foreground">
                                                {category.name}
                                            </span>
                                            <p className="text-xs text-app-muted capitalize">
                                                {category.type}
                                            </p>
                                            <p className="text-xs text-app-muted">
                                                {category.description ||
                                                    "No description"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="p-1.5 text-app-muted hover:text-app-foreground hover:bg-app-card rounded-md transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDelete(category.id)
                                            }
                                            className="p-1.5 text-app-muted hover:text-app-danger hover:bg-app-danger/10 rounded-md transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Add/Edit Form */}
                {(isAdding || editingId) && (
                    <div className="border-t border-app-border pt-4 space-y-3">
                        <h4 className="text-sm font-semibold text-app-foreground">
                            {editingId ? "Edit Category" : "Add Category"}
                        </h4>

                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Category name"
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground text-sm focus:outline-none focus:ring-1 focus:ring-app-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Description
                            </label>
                            <textarea
                                value={formDescription}
                                onChange={(e) =>
                                    setFormDescription(e.target.value)
                                }
                                placeholder="Short description (optional)"
                                rows={2}
                                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground text-sm focus:outline-none focus:ring-1 focus:ring-app-primary resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Type
                            </label>
                            <div className="flex bg-app-surface p-1 rounded-lg">
                                {["expense", "income"].map((entry) => (
                                    <button
                                        key={entry}
                                        onClick={() =>
                                            setFormType(
                                                entry as Category["type"]
                                            )
                                        }
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
                                            formType === entry
                                                ? "bg-app-primary text-white shadow-sm"
                                                : "text-app-muted hover:text-app-foreground"
                                        }`}
                                    >
                                        {entry}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-app-muted mb-1">
                                Color
                            </label>
                            <div className="flex gap-2">
                                {availableColors.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setFormColor(color)}
                                        className={`w-8 h-8 rounded-lg transition-all ${
                                            formColor === color
                                                ? "ring-2 ring-app-primary ring-offset-2 ring-offset-app-card"
                                                : ""
                                        }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-10 h-10 rounded-lg"
                                    style={{
                                        backgroundColor: `${formColor}20`,
                                    }}
                                />
                                <span className="text-sm text-app-foreground">
                                    {formName || "Preview"}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetForm}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={
                                        editingId ? handleUpdate : handleAdd
                                    }
                                    disabled={!formName.trim()}
                                >
                                    {editingId ? "Update" : "Add"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add New Button */}
                {!isAdding && !editingId && (
                    <Button
                        variant="secondary"
                        className="w-full"
                        icon={<Plus size={16} />}
                        onClick={startAdding}
                    >
                        Add Category
                    </Button>
                )}
            </div>
        </Modal>
    );
};
