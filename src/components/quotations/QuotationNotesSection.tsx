
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Control } from "react-hook-form";

interface QuotationNotesSectionProps {
  control: Control<any>;
}

export const QuotationNotesSection = ({ control }: QuotationNotesSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Add any additional notes or terms for this quotation..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
