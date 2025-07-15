import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Mail, Trash2 } from "lucide-react";
import { Quotation } from "@/hooks/useQuotations";
import { format } from 'date-fns';
import { useState } from "react";
import { DeleteConfirmation } from "../common/DeleteConfirmation";

interface QuotationDetailsProps {
  quotation: Quotation;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onEmail: (id: string) => void;
}

export const QuotationDetails = ({ quotation, onEdit, onDelete, onEmail }: QuotationDetailsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const formattedDate = quotation.created_at
    ? format(new Date(quotation.created_at), 'PPP')
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Quotation Details</h2>
          <p className="text-gray-500">
            Quotation Number: {quotation.quotation_number} - Created on {formattedDate}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEmail(quotation.id)}>
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(quotation.id)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete this quotation and all of its data.
                </DialogDescription>
              </DialogHeader>
              <DeleteConfirmation
                onConfirm={() => onDelete(quotation.id)}
                onCancel={() => setIsDeleteOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quotation Info */}
      <Card>
        <CardHeader>
          <CardTitle>Quotation Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-gray-600">Customer Name</p>
            <p className="font-medium">{quotation.customer?.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Customer Mobile</p>
            <p className="font-medium">{quotation.customer?.mobile}</p>
          </div>
          <div>
            <p className="text-gray-600">Worker Name</p>
            <p className="font-medium">{quotation.worker?.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Status</p>
            <p className="font-medium">{quotation.status}</p>
          </div>
          {quotation.notes && (
            <div className="md:col-span-2">
              <p className="text-gray-600">Notes</p>
              <p className="font-medium">{quotation.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotation Items */}
      <Card>
        <CardHeader>
          <CardTitle>Quotation Items</CardTitle>
        </CardHeader>
        <CardContent>
          {quotation.quotation_items && quotation.quotation_items.length > 0 ? (
            <div className="space-y-4">
              {quotation.quotation_items.map((item) => {
                const piecesPerBox = item.tile?.pieces_per_box || 1;
                const tileLengthFt = ((item.tile?.size_length || 0) / 304.8);
                const tileBreadthFt = ((item.tile?.size_breadth || 0) / 304.8);
                const tileAreaSqFt = tileLengthFt * tileBreadthFt;
                
                // Calculate tiles needed with wastage
                const wastagePercentage = quotation.wastage_percentage || 0;
                const basicTiles = tileAreaSqFt > 0 ? item.area / tileAreaSqFt : 0;
                const rawTilesNeeded = Math.ceil(basicTiles * (1 + wastagePercentage / 100));
                
                // Calculate exact breakdown
                const fullBoxes = Math.floor(rawTilesNeeded / piecesPerBox);
                const leftoverTiles = rawTilesNeeded % piecesPerBox;
                const boxesToOrder = Math.ceil(rawTilesNeeded / piecesPerBox);
                
                return (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">
                          {item.tile?.name} ({item.tile?.code})
                          {item.layer_number && (
                            <span className="text-sm text-blue-600 ml-2">
                              Layer {item.layer_number}
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {item.room?.name} - {item.area.toFixed(2)} sq ft
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{item.total_price.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Area</p>
                        <p className="font-medium">{item.area.toFixed(2)} sq ft</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Tiles Required</p>
                        <p className="font-medium text-green-600">
                          {rawTilesNeeded} tiles
                          <span className="text-xs text-gray-500 block">
                            ({fullBoxes} box{fullBoxes !== 1 ? 'es' : ''}
                            {leftoverTiles > 0
                              ? ` and ${leftoverTiles} tile${leftoverTiles !== 1 ? 's' : ''}`
                              : ''})
                            {wastagePercentage > 0 && (
                              <>
                                <br />
                                (+{wastagePercentage}% wastage)
                              </>
                            )}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Boxes to Order</p>
                        <p className="font-medium text-blue-600">
                          {boxesToOrder} boxes
                          <span className="text-xs text-gray-500 block">
                            ({boxesToOrder * piecesPerBox} tiles total)
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Price per Box</p>
                        <p className="font-medium">₹{item.price_per_box}</p>
                        <p className="text-xs text-gray-500">{piecesPerBox} tiles/box</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Cost:</span>
                  <span className="text-xl font-bold text-green-600">
                    ₹{quotation.total_cost?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No items in this quotation</p>
          )}
        </CardContent>
      </Card>

      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-gray-600">Name</p>
            <p className="font-medium">{quotation.customer?.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Mobile</p>
            <p className="font-medium">{quotation.customer?.mobile}</p>
          </div>
          {quotation.customer?.address && (
            <div className="md:col-span-2">
              <p className="text-gray-600">Address</p>
              <p className="font-medium">{quotation.customer?.address}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
