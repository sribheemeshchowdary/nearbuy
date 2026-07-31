import { useState } from "react";
import { collection, getDocs, query, where, writeBatch } from "firebase/firestore";
import { Check, FolderTree, Layers, Loader2, Pencil, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createSubcategoryOption,
  saveCategoryCatalog,
  useCategoryCatalog,
} from "@/hooks/useCategoryCatalog";

interface CategoryManagerProps {
  userId: string;
}

const CategoryManager = ({ userId }: CategoryManagerProps) => {
  const { catalog, loading } = useCategoryCatalog();
  const [categoryName, setCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState("");
  const [editingSubcategory, setEditingSubcategory] = useState<{ category: string; value: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "category"; category: string }
    | { type: "subcategory"; category: string; value: string; label: string }
    | null
  >(null);

  const addCategory = async () => {
    const name = categoryName.trim();
    if (!name) return;
    if (catalog.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      toast.error("That category already exists");
      return;
    }

    setSaving(true);
    try {
      await saveCategoryCatalog([...catalog, { name, subcategories: [] }], userId);
      setCategoryName("");
      setSelectedCategory(name);
      setActiveCategory(name);
      toast.success(`${name} category added`);
    } catch {
      toast.error("Could not add the category");
    } finally {
      setSaving(false);
    }
  };

  const addSubcategory = async () => {
    const label = subcategoryName.trim();
    if (!selectedCategory || !label) return;
    const category = catalog.find((item) => item.name === selectedCategory);
    if (!category) return;
    if (category.subcategories.some((item) => item.label.toLowerCase() === label.toLowerCase())) {
      toast.error("That subcategory already exists");
      return;
    }

    setSaving(true);
    try {
      const updated = catalog.map((item) =>
        item.name === selectedCategory
          ? { ...item, subcategories: [...item.subcategories, createSubcategoryOption(label)] }
          : item,
      );
      await saveCategoryCatalog(updated, userId);
      setSubcategoryName("");
      toast.success(`${label} added under ${selectedCategory}`);
    } catch {
      toast.error("Could not add the subcategory");
    } finally {
      setSaving(false);
    }
  };

  const saveCategoryName = async () => {
    const name = editName.trim();
    if (!editingCategory || !name) return;
    if (catalog.some((item) => item.name !== editingCategory && item.name.toLowerCase() === name.toLowerCase())) {
      toast.error("That category already exists");
      return;
    }

    setSaving(true);
    try {
      await saveCategoryCatalog(
        catalog.map((item) => item.name === editingCategory ? { ...item, name } : item),
        userId,
      );
      if (selectedCategory === editingCategory) setSelectedCategory(name);
      if (activeCategory === editingCategory) setActiveCategory(name);
      setEditingCategory("");
      setEditName("");
      toast.success("Category updated");
    } catch {
      toast.error("Could not update the category");
    } finally {
      setSaving(false);
    }
  };

  const saveSubcategoryName = async () => {
    const label = editName.trim();
    if (!editingSubcategory || !label) return;
    const parent = catalog.find((item) => item.name === editingSubcategory.category);
    if (!parent) return;
    if (parent.subcategories.some((item) =>
      item.value !== editingSubcategory.value && item.label.toLowerCase() === label.toLowerCase()
    )) {
      toast.error("That subcategory already exists");
      return;
    }

    setSaving(true);
    try {
      await saveCategoryCatalog(
        catalog.map((item) => item.name === editingSubcategory.category
          ? {
              ...item,
              subcategories: item.subcategories.map((subcategory) =>
                subcategory.value === editingSubcategory.value
                  ? { ...subcategory, label }
                  : subcategory
              ),
            }
          : item),
        userId,
      );
      setEditingSubcategory(null);
      setEditName("");
      toast.success("Subcategory updated");
    } catch {
      toast.error("Could not update the subcategory");
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setEditingCategory("");
    setEditingSubcategory(null);
    setEditName("");
  };

  const removeSubcategoryValue = (value: unknown, valuesToRemove: Set<string>): unknown => {
    if (Array.isArray(value)) {
      return value
        .filter((item) => typeof item !== "string" || !valuesToRemove.has(item.toLowerCase()))
        .map((item) => removeSubcategoryValue(item, valuesToRemove));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, removeSubcategoryValue(nested, valuesToRemove)]),
      );
    }
    if (typeof value === "string" && valuesToRemove.has(value.toLowerCase())) return "";
    return value;
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const listingsSnapshot = await getDocs(
        query(collection(db, "listings"), where("category", "==", deleteTarget.category)),
      );

      if (deleteTarget.type === "category") {
        if (!listingsSnapshot.empty) {
          toast.error(`Cannot delete ${deleteTarget.category} while ${listingsSnapshot.size} listing(s) still use it`);
          return;
        }
        await saveCategoryCatalog(
          catalog.filter((item) => item.name !== deleteTarget.category),
          userId,
        );
        if (selectedCategory === deleteTarget.category) setSelectedCategory("");
        toast.success(`${deleteTarget.category} deleted`);
        return;
      }

      const valuesToRemove = new Set([
        deleteTarget.value.toLowerCase(),
        deleteTarget.label.toLowerCase(),
      ]);
      const documents = listingsSnapshot.docs;
      for (let start = 0; start < documents.length; start += 400) {
        const batch = writeBatch(db);
        documents.slice(start, start + 400).forEach((listingDocument) => {
          const listing = listingDocument.data();
          const updates: Record<string, unknown> = {};
          if ("subcategoryList" in listing) {
            updates.subcategoryList = removeSubcategoryValue(listing.subcategoryList, valuesToRemove);
          }
          if ("subcategoryData" in listing) {
            updates.subcategoryData = removeSubcategoryValue(listing.subcategoryData, valuesToRemove);
          }
          if ("subcategories" in listing) {
            updates.subcategories = removeSubcategoryValue(listing.subcategories, valuesToRemove);
          }
          if ("subcategory" in listing) {
            updates.subcategory = removeSubcategoryValue(listing.subcategory, valuesToRemove);
          }
          if (Object.keys(updates).length) batch.update(listingDocument.ref, updates);
        });
        await batch.commit();
      }

      await saveCategoryCatalog(
        catalog.map((item) => item.name === deleteTarget.category
          ? {
              ...item,
              subcategories: item.subcategories.filter((subcategory) => subcategory.value !== deleteTarget.value),
            }
          : item),
        userId,
      );
      toast.success(`${deleteTarget.label} deleted; affected listings remain in ${deleteTarget.category}`);
    } catch {
      toast.error("Could not complete the deletion");
    } finally {
      setDeleteTarget(null);
      setSaving(false);
    }
  };

  const totalSubcategories = catalog.reduce((total, item) => total + item.subcategories.length, 0);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleCatalog = catalog.filter((item) =>
    !normalizedSearch
    || item.name.toLowerCase().includes(normalizedSearch)
    || item.subcategories.some((subcategory) => subcategory.label.toLowerCase().includes(normalizedSearch))
  );
  const selectedItem =
    catalog.find((item) => item.name === activeCategory)
    || visibleCatalog[0]
    || catalog[0];

  return (
    <>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Main categories", value: catalog.length, icon: Layers, tone: "bg-primary/10 text-primary" },
            { label: "Subcategories", value: totalSubcategories, icon: FolderTree, tone: "bg-blue-500/10 text-blue-600" },
            { label: "Access", value: "Super Admin", icon: ShieldCheck, tone: "bg-emerald-500/10 text-emerald-600" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{metric.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.tone}`}>
                  <metric.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Create catalogue entries</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">New entries become available immediately in seller and admin listing forms.</p>
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-category">Add a main category</Label>
              <div className="flex gap-2">
                <Input
                  id="new-category"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value.slice(0, 60))}
                  placeholder="Example: Automotive"
                  disabled={saving || loading}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addCategory();
                    }
                  }}
                />
                <Button type="button" onClick={addCategory} disabled={saving || loading || !categoryName.trim()} className="shrink-0">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Add a subcategory</Label>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={saving || loading}>
                  <SelectTrigger><SelectValue placeholder="Parent category" /></SelectTrigger>
                  <SelectContent>
                    {catalog.map((item) => <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  value={subcategoryName}
                  onChange={(event) => setSubcategoryName(event.target.value.slice(0, 60))}
                  placeholder="Example: Car detailing"
                  disabled={saving || loading || !selectedCategory}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addSubcategory();
                    }
                  }}
                />
                <Button type="button" onClick={addSubcategory} disabled={saving || loading || !selectedCategory || !subcategoryName.trim()}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-h-[430px] overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-border/60 bg-secondary/20 lg:border-b-0 lg:border-r">
            <div className="border-b border-border/60 p-4">
              <p className="text-xs font-semibold text-foreground">Category catalogue</p>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search categories"
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>
            <div className="max-h-[360px] overflow-y-auto p-2">
              {visibleCatalog.length ? visibleCatalog.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    setActiveCategory(item.name);
                    cancelEditing();
                  }}
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    selectedItem?.name === item.name
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    selectedItem?.name === item.name ? "bg-white/15" : "bg-background"
                  }`}>
                    <Layers className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{item.name}</span>
                    <span className={`block text-[10px] ${
                      selectedItem?.name === item.name ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      {item.subcategories.length} subcategories
                    </span>
                  </span>
                </button>
              )) : (
                <div className="px-3 py-10 text-center text-xs text-muted-foreground">No categories match your search.</div>
              )}
            </div>
          </aside>

          <section className="p-5 sm:p-6">
            {selectedItem ? (
              <>
                <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Main category</p>
                    {editingCategory === selectedItem.name ? (
                      <div className="mt-2 flex max-w-md gap-2">
                        <Input value={editName} onChange={(event) => setEditName(event.target.value.slice(0, 60))} autoFocus />
                        <Button type="button" size="icon" onClick={saveCategoryName} disabled={saving || !editName.trim()}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button type="button" size="icon" variant="outline" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <>
                        <h3 className="mt-1 truncate text-xl font-bold text-foreground">{selectedItem.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedItem.subcategories.length} configured subcategories
                        </p>
                      </>
                    )}
                  </div>
                  {editingCategory !== selectedItem.name && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSubcategory(null);
                          setEditingCategory(selectedItem.name);
                          setEditName(selectedItem.name);
                        }}
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" />Rename
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget({ type: "category", category: selectedItem.name })}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Subcategories</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">Rename or remove individual options.</p>
                    </div>
                  </div>
                  {selectedItem.subcategories.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedItem.subcategories.map((subcategory) => (
                        <div key={subcategory.value} className="flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2">
                          {editingSubcategory?.category === selectedItem.name && editingSubcategory.value === subcategory.value ? (
                            <>
                              <Input value={editName} onChange={(event) => setEditName(event.target.value.slice(0, 60))} className="h-8 text-xs" autoFocus />
                              <Button type="button" size="icon" className="h-8 w-8 shrink-0" onClick={saveSubcategoryName} disabled={saving || !editName.trim()}>
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={cancelEditing}><X className="h-3.5 w-3.5" /></Button>
                            </>
                          ) : (
                            <>
                              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{subcategory.label}</span>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0"
                                aria-label={`Edit ${subcategory.label}`}
                                onClick={() => {
                                  setEditingCategory("");
                                  setEditingSubcategory({ category: selectedItem.name, value: subcategory.value });
                                  setEditName(subcategory.label);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Delete ${subcategory.label}`}
                                onClick={() => setDeleteTarget({
                                  type: "subcategory",
                                  category: selectedItem.name,
                                  value: subcategory.value,
                                  label: subcategory.label,
                                })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-10 text-center">
                      <FolderTree className="mx-auto h-8 w-8 text-muted-foreground/50" />
                      <p className="mt-3 text-sm font-medium text-foreground">No subcategories yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">Use the form above to add the first subcategory.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select a category to manage it.</div>
            )}
          </section>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => {
        if (!open && !saving) setDeleteTarget(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "category" ? "category" : "subcategory"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "subcategory"
                ? `Listings using “${deleteTarget.label}” will remain in “${deleteTarget.category}” with no deleted subcategory attached.`
                : `“${deleteTarget?.category}” can be deleted only when no listings use it.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CategoryManager;
