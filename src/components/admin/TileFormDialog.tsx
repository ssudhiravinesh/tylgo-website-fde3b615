import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useImageUpload } from "@/hooks/useImageUpload";

const tileSchema = z.object({
  code: z.string().min(1, "Code is required"),
  size_length: z.number().min(1, "Length must be greater than 0").nullable().optional(),
  size_breadth: z.number().min(1, "Breadth must be greater than 0").nullable().optional(),
  price_per_box: z.number().min(0, "Price must be 0 or greater").nullable().optional(),
  pieces_per_box: z.number().min(1, "Pieces per box must be greater than 0").nullable().optional(),
  image_url: z.string().optional(),
  category: z.string().min(1, "Category is required"),
}).transform((data) => ({
  ...data,
  size_length: data.size_length || undefined,
  size_breadth: data.size_breadth || undefined,
  price_per_box: data.price_per_box || undefined,
  pieces_per_box: data.pieces_per_box || undefined,
}));

export type TileFormData = z.infer<typeof tileSchema>;

interface TileFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initialData?: any;
  categories: string[];
  onSubmit: (data: TileFormData, imageFile: File | null) => Promise<void>;
  isPending: boolean;
}

export const TileFormDialog = ({
  isOpen,
  onClose,
  mode,
  initialData,
  categories,
  onSubmit,
  isPending,
}: TileFormDialogProps) => {
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [categoryInput, setCategoryInput] = useState("");
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(-1);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadImage, isUploading } = useImageUpload();

  const form = useForm<TileFormData>({
    resolver: zodResolver(tileSchema),
    defaultValues: {
      code: "",
      size_length: undefined,
      size_breadth: undefined,
      price_per_box: undefined,
      pieces_per_box: undefined,
      image_url: "",
      category: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        form.reset({
          code: initialData.code,
          size_length: initialData.size_length,
          size_breadth: initialData.size_breadth,
          price_per_box: initialData.price_per_box || undefined,
          pieces_per_box: initialData.pieces_per_box || undefined,
          image_url: initialData.image_url || "",
          category: initialData.category || "",
        });
        setImagePreview(initialData.image_url || "");
        setSelectedImageFile(null);
        setCategoryInput(initialData.category || "");
      } else {
        form.reset({
          code: "",
          size_length: undefined,
          size_breadth: undefined,
          price_per_box: undefined,
          pieces_per_box: undefined,
          image_url: "",
          category: "",
        });
        setImagePreview("");
        setSelectedImageFile(null);
        setCategoryInput("");
      }
    }
  }, [isOpen, mode, initialData, form]);

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(categoryInput.toLowerCase())
  );

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (data: TileFormData) => {
    let imageUrl = data.image_url || null;

    if (selectedImageFile) {
      const uploadedUrl = await uploadImage(selectedImageFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }
    
    const finalData = { ...data, image_url: imageUrl || undefined };
    await onSubmit(finalData, selectedImageFile);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add New Tile" : "Edit Tile"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tile Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., TH007" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <FormField
                control={form.control}
                name="size_length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Length (mm)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="600"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? null : Number(value));
                        }}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="size_breadth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breadth (mm)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="600"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? null : Number(value));
                        }}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price_per_box"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price/Box</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        placeholder="450"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? null : Number(value));
                        }}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pieces_per_box"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pieces/Box</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="4"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? null : Number(value));
                        }}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="relative">
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      ref={categoryInputRef}
                      placeholder="e.g., Bathroom, Kitchen, Living Room"
                      onFocus={() => {
                        setShowCategorySuggestions(true);
                        setSelectedCategoryIndex(-1);
                      }}
                      onChange={(e) => {
                        const upperValue = e.target.value.toUpperCase();
                        field.onChange(upperValue);
                        setCategoryInput(upperValue);
                        setShowCategorySuggestions(true);
                        setSelectedCategoryIndex(-1);
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowCategorySuggestions(false), 200);
                      }}
                      onKeyDown={(e) => {
                        if (!showCategorySuggestions || filteredCategories.length === 0) return;
                        
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setSelectedCategoryIndex((prev) => 
                            prev < filteredCategories.length - 1 ? prev + 1 : 0
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setSelectedCategoryIndex((prev) => 
                            prev > 0 ? prev - 1 : filteredCategories.length - 1
                          );
                        } else if (e.key === "Enter" && selectedCategoryIndex >= 0) {
                          e.preventDefault();
                          const selected = filteredCategories[selectedCategoryIndex];
                          field.onChange(selected);
                          setCategoryInput(selected);
                          setShowCategorySuggestions(false);
                        } else if (e.key === "Escape") {
                          setShowCategorySuggestions(false);
                        }
                      }}
                    />
                  </FormControl>
                  {showCategorySuggestions && filteredCategories.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredCategories.map((category, index) => (
                        <div
                          key={category}
                          className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
                            index === selectedCategoryIndex 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-muted"
                          }`}
                          onClick={() => {
                            field.onChange(category);
                            setCategoryInput(category);
                            setShowCategorySuggestions(false);
                          }}
                        >
                          {category}
                        </div>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Tile Image</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted hover:bg-muted transition-colors">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-md" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground/70" />
                        <p className="text-xs text-muted-foreground">Upload Image</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageFileChange} />
                  </label>
                  {imagePreview && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setImagePreview(""); setSelectedImageFile(null); }} className="w-full text-xs">
                      Remove
                    </Button>
                  )}
                </div>
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Or Image URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isPending || isUploading}>
                {isUploading ? "Uploading..." : isPending ? (mode === "add" ? "Adding..." : "Updating...") : (mode === "add" ? "Add Tile" : "Update Tile")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
