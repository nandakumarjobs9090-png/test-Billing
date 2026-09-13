
"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  X, 
  Download, 
  Printer,
  Loader2,
  Inbox,
  CalendarCheck,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  History,
  Globe,
  FileSpreadsheet,
  FolderUp,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Transaction, ShopProfile, Expense } from '@/lib/types';
import { format, isToday, isYesterday, subDays, subMonths, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase';
import { DateRange } from 'react-day-picker';

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
type StatusFilter = 'All' | 'Paid' | 'Pending' | 'Cancelled' | 'Reprinted';
type TimeRange = 'all' | 'today' | 'yesterday' | '1w' | '1m' | '3m' | '6m';

export default function HistoryPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortOrder, setSortOrder] = useState<SortOption>('date-desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [exportedFileName, setExportedFileName] = useState('');

  // Reprint states
  const [transactionToReprint, setTransactionToReprint] = useState<Transaction | null>(null);
  const [reprintReason, setReprintReason] = useState('');
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printingData, setPrintingData] = useState<{
    transaction: Transaction;
    profile: ShopProfile | null;
  } | null>(null);

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
    setCurrentTime(new Date());
  }, [user, isUserLoading, router]);
  
  const transactionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
  }, [db, user]);

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'expenses'), orderBy('date', 'desc'));
  }, [db, user]);

  const { data: transData, loading: transLoading } = useCollection<Transaction>(transactionsQuery);
  const { data: expData, loading: expLoading } = useCollection<Expense>(expensesQuery);
  
  const transactions = transData || [];
  const expenses = expData || [];

  const shopRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'settings', 'shop');
  }, [db, user]);
  const { data: shopProfile } = useDoc<ShopProfile>(shopRef);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => {
        const matchesSerial = t.serialNumber && String(t.serialNumber).toLowerCase().includes(q);
        const matchesItems = t.items?.some(item => item.name.toLowerCase().includes(q));
        const matchesPrice = t.finalAmount && String(t.finalAmount).includes(q);
        return matchesSerial || matchesItems || matchesPrice;
      });
    }

    if (dateRange?.from) {
      result = result.filter((t) => {
        if (!t.date) return false;
        const d = new Date(t.date).getTime();
        const start = new Date(dateRange.from!).setHours(0, 0, 0, 0);
        const end = new Date(dateRange.to || dateRange.from!).setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      });
    } else if (timeRange !== 'all' && currentTime) {
      result = result.filter(t => {
        if (!t.date) return false;
        const date = new Date(t.date);
        switch (timeRange) {
          case 'today': return isToday(date);
          case 'yesterday': return isYesterday(date);
          case '1w': return isAfter(date, subDays(currentTime, 7));
          case '1m': return isAfter(date, subMonths(currentTime, 1));
          case '3m': return isAfter(date, subMonths(currentTime, 3));
          case '6m': return isAfter(date, subMonths(currentTime, 6));
          default: return true;
        }
      });
    }

    if (statusFilter !== 'All') {
      if (statusFilter === 'Reprinted') {
        result = result.filter((t) => t.isReprinted === true);
      } else {
        result = result.filter((t) => t.paymentStatus === statusFilter);
      }
    }

    result.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      switch (sortOrder) {
        case 'date-desc': return timeB - timeA;
        case 'date-asc': return timeA - timeB;
        case 'amount-desc': return (b.finalAmount || 0) - (a.finalAmount || 0);
        case 'amount-asc': return (a.finalAmount || 0) - (b.finalAmount || 0);
        default: return 0;
      }
    });

    return result;
  }, [transactions, searchQuery, dateRange, timeRange, sortOrder, statusFilter, currentTime]);

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    if (dateRange?.from) {
      result = result.filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date).getTime();
        const start = new Date(dateRange.from!).setHours(0, 0, 0, 0);
        const end = new Date(dateRange.to || dateRange.from!).setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      });
    } else if (timeRange !== 'all' && currentTime) {
      result = result.filter(e => {
        if (!e.date) return false;
        const date = new Date(e.date);
        switch (timeRange) {
          case 'today': return isToday(date);
          case 'yesterday': return isYesterday(date);
          case '1w': return isAfter(date, subDays(currentTime, 7));
          case '1m': return isAfter(date, subMonths(currentTime, 1));
          case '3m': return isAfter(date, subMonths(currentTime, 3));
          case '6m': return isAfter(date, subMonths(currentTime, 6));
          default: return true;
        }
      });
    }

    return result;
  }, [expenses, dateRange, timeRange, currentTime]);

  const financialSummary = useMemo(() => {
    const totalSales = filteredTransactions
      .filter(t => t.paymentStatus === 'Paid')
      .reduce((acc, t) => acc + (t.finalAmount || 0), 0);
    
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const netProfit = totalSales - totalExpenses;

    return { totalSales, totalExpenses, netProfit };
  }, [filteredTransactions, filteredExpenses]);

  const handleOpenReasonDialog = (t: Transaction) => {
    setTransactionToReprint(t);
    setReprintReason('');
    setIsReasonDialogOpen(true);
  };

  const handleActualPrint = async () => {
    if (!transactionToReprint || !db || !user || !reprintReason.trim()) return;

    setIsPrinting(true);
    const updatedTransaction = { 
      ...transactionToReprint, 
      isReprinted: true, 
      reprintReason: reprintReason.trim() 
    };

    setPrintingData({ transaction: updatedTransaction, profile: shopProfile || null });

    const transDocRef = doc(db, 'users', user.uid, 'transactions', transactionToReprint.id);
    updateDocumentNonBlocking(transDocRef, { 
      isReprinted: true, 
      reprintReason: reprintReason.trim() 
    });

    setIsReasonDialogOpen(false);
    await new Promise(resolve => setTimeout(resolve, 500));

    const paperW = shopProfile?.paperWidth || '80mm';
    const pdfW = parseInt(paperW);

    if (shopProfile?.printerType === 'browser') {
      window.print();
    } else {
      try {
        const { default: jsPDF } = await import('jspdf');
        const { default: html2canvas } = await import('html2canvas');
        if (printRef.current) {
          const canvas = await html2canvas(printRef.current, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/png');
          const pdfHeight = (canvas.height * pdfW) / canvas.width;
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pdfW, pdfHeight]
          });
          pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfHeight);
          pdf.save(`reprint-${transactionToReprint.serialNumber}.pdf`);
        }
      } catch (err) {
        window.print();
      }
    }

    setTimeout(() => {
      setIsPrinting(false);
      setPrintingData(null);
      setTransactionToReprint(null);
      setReprintReason('');
      toast({ title: "Bill Reprinted", description: `Bill ${updatedTransaction.serialNumber} reprinted successfully.` });
    }, 500);
  };

  const handleExport = async (formatType: 'csv' | 'excel' | 'pdf' | 'googlesheets') => {
    const salesToExport = filteredTransactions.filter(t => t.paymentStatus === 'Paid');
    const expensesToExport = filteredExpenses;

    if (salesToExport.length === 0 && expensesToExport.length === 0) {
      toast({ title: "No records to export", description: "Adjust your filters and try again.", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    const { totalSales, totalExpenses, netProfit } = financialSummary;
    
    let dateRangeStr = '_all';
    if (dateRange?.from) {
      const start = format(dateRange.from, 'yyyyMMdd');
      const end = dateRange.to ? `-${format(dateRange.to, 'yyyyMMdd')}` : '';
      dateRangeStr = `_custom_${start}${end}`;
    } else if (timeRange !== 'all') {
      dateRangeStr = `_${timeRange}`;
    }
    
    try {
      if (formatType === 'googlesheets') {
        const XLSX = await import('xlsx');
        const fileName = `Google_Sheets_Performance_Report${dateRangeStr}.xlsx`;

        // 1. Executive Summary Sheet
        const summarySheetData = [
          ["BUSINESS PERFORMANCE REPORT (GOOGLE SHEETS & DRIVE FORMAT)"],
          ["Shop / Business Name:", shopProfile?.shopName || "Free Bill App"],
          ["Export Date:", format(new Date(), 'yyyy-MM-dd HH:mm')],
          ["Selected Period:", dateRangeStr.replace('_', ' ')],
          [""],
          ["METRIC", "VALUE"],
          ["Total Gross Sales (Rs.)", totalSales],
          ["Total Operating Expenses (Rs.)", totalExpenses],
          ["NET PROFIT / LOSS (Rs.)", netProfit],
          ["Total Completed Transactions", salesToExport.length],
          ["Average Order Value (Rs.)", salesToExport.length > 0 ? (totalSales / salesToExport.length).toFixed(2) : 0],
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);

        // 2. Sales Register Sheet
        const salesSheetData = salesToExport.map(t => ({
          'Bill Serial No': t.serialNumber || 'N/A',
          'Date & Time': t.date ? format(new Date(t.date), 'yyyy-MM-dd HH:mm') : 'N/A',
          'Payment Mode': t.paymentMethod || 'Cash',
          'Items Breakdown': t.items?.map(i => `${i.name} (x${i.quantity})`).join(', ') || '',
          'Subtotal (Rs.)': t.total || t.finalAmount,
          'Discount (Rs.)': t.discount || 0,
          'Tax / GST (Rs.)': t.gstAmount || 0,
          'Final Amount (Rs.)': t.finalAmount,
          'Payment Status': t.paymentStatus
        }));
        const wsSales = XLSX.utils.json_to_sheet(salesSheetData);

        // 3. Expenses Register Sheet
        const expenseSheetData = expensesToExport.map(e => ({
          'Expense Description': e.description,
          'Category': e.category,
          'Date': e.date ? format(new Date(e.date), 'yyyy-MM-dd') : 'N/A',
          'Amount (Rs.)': e.amount
        }));
        const wsExpenses = XLSX.utils.json_to_sheet(expenseSheetData);

        // 4. Product Sales Summary Sheet
        const itemMap: Record<string, { qty: number; total: number }> = {};
        salesToExport.forEach(t => {
          t.items?.forEach(i => {
            if (!itemMap[i.name]) itemMap[i.name] = { qty: 0, total: 0 };
            itemMap[i.name].qty += i.quantity;
            itemMap[i.name].total += (i.price * i.quantity);
          });
        });
        const productSummaryData = Object.entries(itemMap).map(([name, val]) => ({
          'Product Name': name,
          'Total Units Sold': val.qty,
          'Total Revenue (Rs.)': val.total
        }));
        const wsProducts = XLSX.utils.json_to_sheet(productSummaryData);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");
        XLSX.utils.book_append_sheet(wb, wsSales, "Sales Register");
        XLSX.utils.book_append_sheet(wb, wsExpenses, "Expenses Register");
        XLSX.utils.book_append_sheet(wb, wsProducts, "Product Sales Summary");

        XLSX.writeFile(wb, fileName);

        setExportedFileName(fileName);
        setIsExportDialogOpen(false);
        setIsGoogleDriveModalOpen(true);

        toast({
          title: "Google Sheets Report Ready",
          description: "Spreadsheet downloaded in Google Sheets format. Upload to Google Drive to view.",
        });
      }

      if (formatType === 'csv') {
        const rows: string[][] = [];
        rows.push(["SALES TRANSACTIONS"]);
        rows.push(["Bill No", "Date", "Items", "Amount (Rs.)", "Status"]);
        salesToExport.forEach(t => rows.push([
          t.serialNumber || 'N/A',
          t.date ? format(new Date(t.date), 'yyyy-MM-dd HH:mm') : 'N/A',
          t.items?.map(i => `${i.name} x${i.quantity}`).join('; ') || '',
          t.finalAmount.toString(),
          t.paymentStatus
        ]));
        rows.push(["", "", "TOTAL SALES", totalSales.toString(), ""]);
        rows.push([""]);

        rows.push(["EXPENSES"]);
        rows.push(["Description", "Date", "Category", "Amount (Rs.)"]);
        expensesToExport.forEach(e => rows.push([
          e.description,
          e.date ? format(new Date(e.date), 'yyyy-MM-dd') : 'N/A',
          e.category,
          e.amount.toString()
        ]));
        rows.push(["", "", "TOTAL EXPENSES", totalExpenses.toString()]);
        rows.push([""]);

        rows.push(["SUMMARY"]);
        rows.push(["Total Sales", totalSales.toString()]);
        rows.push(["Total Expenses", totalExpenses.toString()]);
        rows.push(["NET PROFIT", netProfit.toString()]);

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.map(c => `"${c}"`).join(',')).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `report${dateRangeStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      if (formatType === 'excel') {
        const XLSX = await import('xlsx');
        const salesData = salesToExport.map(t => ({
          'Type': 'Sale',
          'Bill No/Desc': t.serialNumber || 'N/A',
          Date: t.date ? format(new Date(t.date), 'yyyy-MM-dd HH:mm') : 'N/A',
          Items: t.items?.map(i => `${i.name} x${i.quantity}`).join(', ') || '',
          'Amount (Rs.)': t.finalAmount,
          Status: t.paymentStatus
        }));
        const expenseData = expensesToExport.map(e => ({
          'Type': 'Expense',
          'Bill No/Desc': e.description,
          Date: e.date ? format(new Date(e.date), 'yyyy-MM-dd') : 'N/A',
          Items: e.category,
          'Amount (Rs.)': -e.amount,
          Status: 'N/A'
        }));

        const combinedData = [...salesData, ...expenseData];
        const ws = XLSX.utils.json_to_sheet(combinedData);
        XLSX.utils.sheet_add_aoa(ws, [["", "", "", "TOTAL SALES", totalSales]], { origin: -1 });
        XLSX.utils.sheet_add_aoa(ws, [["", "", "", "TOTAL EXPENSES", totalExpenses]], { origin: -1 });
        XLSX.utils.sheet_add_aoa(ws, [["", "", "", "NET PROFIT", netProfit]], { origin: -1 });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `report${dateRangeStr}.xlsx`);
      }

      if (formatType === 'pdf') {
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.setTextColor(163, 78, 63);
        doc.text(shopProfile?.shopName || "Business Report", 105, 15, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        let yPos = 22;
        
        if (shopProfile?.address) {
          const addressLines = doc.splitTextToSize(shopProfile.address, 160);
          doc.text(addressLines, 105, yPos, { align: 'center' });
          yPos += (addressLines.length * 5);
        }
        
        const contactInfo = [];
        if (shopProfile?.phone) contactInfo.push(`Ph: ${shopProfile.phone}`);
        if (shopProfile?.email) contactInfo.push(`Email: ${shopProfile.email}`);
        if (contactInfo.length > 0) {
          doc.text(contactInfo.join(' | '), 105, yPos, { align: 'center' });
          yPos += 5;
        }

        const taxLicInfo = [];
        if (shopProfile?.gstNumber) taxLicInfo.push(`GST: ${shopProfile.gstNumber}`);
        if (shopProfile?.fssaiNumber) taxLicInfo.push(`FSSAI: ${shopProfile.fssaiNumber}`);
        if (taxLicInfo.length > 0) {
          doc.text(taxLicInfo.join(' | '), 105, yPos, { align: 'center' });
          yPos += 5;
        }

        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos + 2, 196, yPos + 2);
        yPos += 12;

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Performance Summary", 14, yPos);
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 196, yPos, { align: 'right' });
        doc.text(`Filter: ${timeRange.toUpperCase()} ${dateRange?.from ? `(${format(dateRange.from, 'MMM dd')} - ${dateRange.to ? format(dateRange.to, 'MMM dd') : ''})` : ''}`, 14, yPos + 5);
        yPos += 10;

        autoTable(doc, {
          head: [['Total Sales (A)', 'Total Expenses (B)', 'Net Profit (A - B)']],
          body: [[`Rs.${totalSales.toLocaleString()}`, `Rs.${totalExpenses.toLocaleString()}`, `Rs.${netProfit.toLocaleString()}`]],
          startY: yPos,
          theme: 'grid',
          styles: { fontSize: 10, halign: 'center', cellPadding: 5 },
          headStyles: { fillColor: [163, 78, 63], textColor: [255, 255, 255] }
        });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Sales Transactions", 14, (doc as any).lastAutoTable.finalY + 12);
        
        autoTable(doc, {
          head: [['Bill No', 'Date', 'Items Breakdown', 'Amount (Rs.)', 'Method']],
          body: salesToExport.map(t => [
            t.serialNumber || 'N/A',
            t.date ? format(new Date(t.date), 'MMM dd, HH:mm') : 'N/A',
            t.items?.map(i => `${i.name} x${i.quantity}`).join(', ') || '',
            t.finalAmount.toLocaleString(),
            t.paymentMethod
          ]),
          startY: (doc as any).lastAutoTable.finalY + 16,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255] }
        });

        doc.setFontSize(12);
        doc.text("Expense Records", 14, (doc as any).lastAutoTable.finalY + 12);
        
        autoTable(doc, {
          head: [['Description', 'Date', 'Category', 'Amount (Rs.)']],
          body: expensesToExport.map(e => [
            e.description,
            e.date ? format(new Date(e.date), 'MMM dd, yyyy') : 'N/A',
            e.category,
            e.amount.toLocaleString()
          ]),
          startY: (doc as any).lastAutoTable.finalY + 16,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [150, 50, 50], textColor: [255, 255, 255] }
        });

        doc.save(`business-report${dateRangeStr}.pdf`);
      }
    } catch (error) {
      toast({ title: "Export Error", description: "Failed to generate report file.", variant: "destructive" });
    } finally {
      setIsExporting(false);
      setIsExportDialogOpen(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange(undefined);
    setTimeRange('all');
    setSortOrder('date-desc');
    setStatusFilter('All');
  };

  const isFiltered = searchQuery !== '' || dateRange !== undefined || timeRange !== 'all' || statusFilter !== 'All' || sortOrder !== 'date-desc';

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64 flex flex-col h-screen">
      <div className="print-hidden">
        <Sidebar />
        <MobileNav />
      </div>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden print-hidden">
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-headline font-bold">Performance History</h2>
              <p className="text-muted-foreground">Audit sales, expenses, and overall profit.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                className="gap-2 shadow-sm border-primary/20 text-primary hover:bg-primary/5" 
                onClick={() => setIsExportDialogOpen(true)} 
                disabled={isExporting || transLoading || expLoading}
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export Report
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <Card className="border-none shadow-sm bg-card overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Sales</p>
                  <TrendingUp className="w-5 h-5 text-primary opacity-50" />
                </div>
                <h3 className="text-2xl font-bold font-headline text-primary mb-1">
                  Rs.{financialSummary.totalSales.toLocaleString()}
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-70">
                  {filteredTransactions.filter(t => t.paymentStatus === 'Paid').length} Successful Sales
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Expenses</p>
                  <TrendingDown className="w-5 h-5 text-destructive opacity-50" />
                </div>
                <h3 className="text-2xl font-bold font-headline text-destructive mb-1">
                  Rs.{financialSummary.totalExpenses.toLocaleString()}
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-70">
                  {filteredExpenses.length} Expense Records
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-accent/5 overflow-hidden border-accent/10 border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Net Profit</p>
                  <IndianRupee className="w-5 h-5 text-accent opacity-50" />
                </div>
                <h3 className="text-2xl font-bold font-headline text-accent mb-1">
                  Rs.{financialSummary.netProfit.toLocaleString()}
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-70">
                  Sales minus Expenses
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search bills..." 
                className="pl-10 bg-card border-none shadow-sm h-11" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={timeRange} onValueChange={(v: TimeRange) => { setTimeRange(v); if (v !== 'all') setDateRange(undefined); }}>
                <SelectTrigger className="w-[140px] bg-card border-none shadow-sm h-11">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="1w">Last 7 Days</SelectItem>
                  <SelectItem value="1m">Last 30 Days</SelectItem>
                  <SelectItem value="3m">3 Months</SelectItem>
                  <SelectItem value="6m">6 Months</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("bg-card border-none shadow-sm gap-2 h-11 min-w-[160px]", dateRange?.from && "text-primary font-bold border-primary")}>
                    <CalendarCheck className="w-4 h-4" /> 
                    {dateRange?.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                      ) : (
                        format(dateRange.from, 'MMM dd, yyyy')
                      )
                    ) : (
                      'Custom Date'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar 
                    mode="range" 
                    selected={dateRange} 
                    onSelect={(range) => { setDateRange(range); if (range?.from) setTimeRange('all'); }} 
                    initialFocus 
                    className="month:space-y-4 month:w-full month:block"
                  />
                </PopoverContent>
              </Popover>

              <Select value={statusFilter} onValueChange={(v: StatusFilter) => setStatusFilter(v)}>
                <SelectTrigger className="w-[130px] bg-card border-none shadow-sm h-11">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Reprinted">Reprinted</SelectItem>
                </SelectContent>
              </Select>
              {isFiltered && <Button variant="ghost" onClick={clearFilters} className="h-11"><X className="w-4 h-4 mr-1" /> Clear</Button>}
            </div>
          </div>

          <Card className="border-none shadow-sm overflow-hidden min-h-[400px]">
            {transLoading || expLoading || !user ? (
              <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Inbox className="w-16 h-16 opacity-20 mb-4" />
                <p>No transactions found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="whitespace-nowrap px-6 py-4">Bill No</TableHead>
                      <TableHead className="whitespace-nowrap px-6 py-4">Date & Time</TableHead>
                      <TableHead className="whitespace-nowrap px-6 py-4">Items Summary</TableHead>
                      <TableHead className="whitespace-nowrap px-6 py-4">Total</TableHead>
                      <TableHead className="whitespace-nowrap px-6 py-4">Status</TableHead>
                      <TableHead className="text-right px-6 py-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((t) => (
                      <TableRow key={t.id} className="group hover:bg-muted/10">
                        <TableCell className="px-6 py-4 font-bold text-xs text-primary">{t.serialNumber || 'N/A'}</TableCell>
                        <TableCell className="px-6 py-4">{t.date ? format(new Date(t.date), 'MMM dd, HH:mm') : 'N/A'}</TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {t.items?.map((item, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[9px] bg-muted/50">{item.name} x{item.quantity}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className={cn("px-6 py-4 font-bold", t.paymentStatus === 'Cancelled' && "line-through opacity-50")}>Rs.{t.finalAmount}</TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <Badge className={cn(t.paymentStatus === 'Paid' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                              {t.paymentStatus}
                            </Badge>
                            {t.paymentStatus === 'Cancelled' && t.cancellationReason && (
                              <span className="text-[9px] text-destructive font-bold italic max-w-[100px] truncate print-hidden" title={t.cancellationReason}>
                                {t.cancellationReason}
                              </span>
                            )}
                            {t.isReprinted && t.reprintReason && (
                              <span className="text-[9px] text-blue-600 font-bold italic max-w-[100px] truncate print-hidden" title={t.reprintReason}>
                                Reprinted: {t.reprintReason}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenReasonDialog(t)}><Printer className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </main>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-md print-hidden">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Export Performance Report</DialogTitle>
            <DialogDescription>
              Generate a full performance report including Sales, Expenses, and Product breakdown.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 shadow-sm" 
              onClick={() => handleExport('googlesheets')}
            >
              <Globe className="w-6 h-6 text-primary" />
              <span className="font-bold text-xs">Google Sheets & Drive</span>
              <span className="text-[10px] text-muted-foreground">Multi-sheet XLSX report</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-24 gap-2 shadow-sm" onClick={() => handleExport('excel')}>
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
              <span className="font-bold text-xs">Excel (.xlsx)</span>
              <span className="text-[10px] text-muted-foreground">Standard Spreadsheet</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-24 gap-2 shadow-sm" onClick={() => handleExport('pdf')}>
              <FileText className="w-6 h-6 text-red-600" />
              <span className="font-bold text-xs">PDF Document</span>
              <span className="text-[10px] text-muted-foreground">Printable Report</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-24 gap-2 shadow-sm" onClick={() => handleExport('csv')}>
              <Download className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-xs">CSV File</span>
              <span className="text-[10px] text-muted-foreground">Comma Separated Data</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Drive Upload & Integration Dialog */}
      <Dialog open={isGoogleDriveModalOpen} onOpenChange={setIsGoogleDriveModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Globe className="w-5 h-5" />
              <DialogTitle>Upload to Google Drive & Google Sheets</DialogTitle>
            </div>
            <DialogDescription>
              Your formatted report <strong>{exportedFileName}</strong> has been downloaded to your computer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-4 bg-muted/30 rounded-xl border space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Google Drive Quick Actions</h4>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="https://drive.google.com/drive/my-drive"
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center p-3 bg-card border rounded-xl hover:border-primary transition-all text-center gap-1.5 shadow-sm group"
                >
                  <FolderUp className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">Open Google Drive</span>
                  <span className="text-[10px] text-muted-foreground">Upload file to Drive</span>
                </a>
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center p-3 bg-card border rounded-xl hover:border-primary transition-all text-center gap-1.5 shadow-sm group"
                >
                  <FileSpreadsheet className="w-6 h-6 text-green-600 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs">New Google Sheet</span>
                  <span className="text-[10px] text-muted-foreground">Import & edit live</span>
                </a>
              </div>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/20">
              <p className="font-bold text-foreground">How to import into Google Sheets:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click <strong>Open Google Drive</strong> above.</li>
                <li>Drag and drop the downloaded file <code className="bg-muted px-1 rounded">{exportedFileName}</code> into Drive.</li>
                <li>Double-click the file in Google Drive to open as Google Sheets with 4 formatted worksheets!</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsGoogleDriveModalOpen(false)} className="w-full font-bold">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="fixed -left-[5000px] top-0 overflow-hidden bg-white print:static print:left-0 print:block print:w-full print:bg-white print:z-50">
        {printingData && (
          <div 
            ref={printRef}
            className="bg-white text-black p-6 font-mono leading-relaxed print:p-0" 
            style={{ width: printingData.profile?.paperWidth || '80mm', minHeight: 'auto', display: 'block' }}
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold uppercase text-black mb-1">{printingData.profile?.shopName || 'BUSINESS NAME'}</h1>
              {printingData.profile?.address && <p className="text-[11px] text-black px-4">{printingData.profile.address}</p>}
              {printingData.profile?.phone && <p className="text-[11px] text-black">Ph: {printingData.profile.phone}</p>}
              {printingData.profile?.gstEnabled && printingData.profile?.gstNumber && (
                <p className="text-[11px] text-black">GST: {printingData.profile.gstNumber}</p>
              )}
              {printingData.profile?.fssaiEnabled && printingData.profile?.fssaiNumber && (
                <p className="text-[11px] text-black italic">FSSAI Lic No: {printingData.profile.fssaiNumber}</p>
              )}
            </div>
            <div className="border-b border-dashed border-black mb-4"></div>
            <div className="text-center font-bold text-sm mb-4 border border-black py-1">REPRINTED BILL</div>
            <div className="space-y-1 mb-4 px-1">
              {printingData.transaction.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[12px] text-black">
                  <span className="flex-1 pr-4">{item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                  <span className="whitespace-nowrap font-bold">Rs.{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-b border-dashed border-black mb-4"></div>
            <div className="space-y-1 text-[12px] text-black px-1">
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span>Rs.{printingData.transaction.total.toFixed(2)}</span>
              </div>
              {printingData.transaction.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-Rs.{printingData.transaction.discount.toFixed(2)}</span>
                </div>
              )}
              {printingData.transaction.gstAmount > 0 && (
                <div className="flex justify-between">
                  <span>GST ({printingData.profile?.gstPercentage}%) {printingData.profile?.gstIncluded ? '(Incl.)' : ''}</span>
                  <span>Rs.{printingData.transaction.gstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t border-dotted border-black">
                <span>TOTAL</span>
                <span>Rs.{printingData.transaction.finalAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="border-b border-dashed border-black my-6"></div>
            <div className="text-[10px] space-y-2 text-black text-center">
              {printingData.profile?.billFooter && <p className="font-bold text-sm">{printingData.profile.billFooter}</p>}
              {printingData.transaction.fortune && (
                <div className="border-y border-black py-2 my-2">
                  <p className="italic text-[11px]">"{printingData.transaction.fortune}"</p>
                </div>
              )}
              <p>Original Date: {format(new Date(printingData.transaction.date), 'MM/dd/yyyy HH:mm')}</p>
              <p>Reprint Date: {format(new Date(), 'MM/dd/yyyy HH:mm')}</p>
              <p>ID: {printingData.transaction.serialNumber}</p>
            </div>
            <div className="h-8"></div>
          </div>
        )}
      </div>

      <Dialog open={isReasonDialogOpen} onOpenChange={setIsReasonDialogOpen}>
        <DialogContent className="print-hidden">
          <DialogHeader>
            <DialogTitle>Reprint Bill</DialogTitle>
            <DialogDescription>Please provide a reason for reprinting this bill.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="e.g. Printer Jam, Customer Request" 
              value={reprintReason} 
              onChange={(e) => setReprintReason(e.target.value)}
            />
          </div>
          <Button onClick={handleActualPrint} disabled={!reprintReason.trim() || isPrinting}>
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
            Confirm Reprint
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
