
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  IndianRupee, TrendingUp, Loader2, Calendar, Eye, EyeOff, 
  Search, Trophy, Package, Trash2, Ban, AlertCircle, 
  Wallet, Banknote, ReceiptIndianRupee, ArrowDownCircle,
  Receipt
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Transaction, Expense } from '@/lib/types';
import { format, isToday, isYesterday, subDays, subMonths, isAfter } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
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

type TimeRange = 'today' | 'yesterday' | '1w' | '1m';

export default function Dashboard() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [showRevenue, setShowRevenue] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  const [transactionToCancel, setTransactionToCancel] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    setCurrentTime(new Date());
  }, []);

  const transactionsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
  }, [db, user]);

  const expensesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'expenses'), orderBy('date', 'desc'));
  }, [db, user]);

  const { data: transactions, loading: transLoading } = useCollection<Transaction>(transactionsRef);
  const { data: expenses, loading: expLoading } = useCollection<Expense>(expensesRef);

  const filteredData = useMemo(() => {
    const allTrans = transactions || [];
    const allExp = expenses || [];
    if (!currentTime) return { transactions: [], expenses: [] };
    
    const filterFn = (item: any) => {
      if (!item.date) return false;
      const date = new Date(item.date);
      switch (timeRange) {
        case 'today': return isToday(date);
        case 'yesterday': return isYesterday(date);
        case '1w': return isAfter(date, subDays(currentTime, 7));
        case '1m': return isAfter(date, subMonths(currentTime, 1));
        default: return true;
      }
    };

    return {
      transactions: allTrans.filter(filterFn),
      expenses: allExp.filter(filterFn)
    };
  }, [transactions, expenses, timeRange, currentTime]);

  const stats = useMemo(() => {
    const paidTrans = filteredData.transactions.filter(t => t.paymentStatus === 'Paid');
    const cancelledTrans = filteredData.transactions.filter(t => t.paymentStatus === 'Cancelled');

    const cashSales = paidTrans.filter(t => t.paymentMethod === 'Cash').reduce((acc, t) => acc + t.finalAmount, 0);
    const upiSales = paidTrans.filter(t => t.paymentMethod === 'UPI').reduce((acc, t) => acc + t.finalAmount, 0);
    const totalSales = cashSales + upiSales;
    
    const totalCancelled = cancelledTrans.reduce((acc, t) => acc + t.finalAmount, 0);
    const totalExp = filteredData.expenses.reduce((acc, e) => acc + e.amount, 0);

    return [
      { 
        title: "Net Sales", 
        value: `Rs.${totalSales.toLocaleString()}`, 
        icon: TrendingUp, 
        detail: `Cash: Rs.${cashSales.toLocaleString()} | UPI: Rs.${upiSales.toLocaleString()}`, 
        colorClass: "text-primary" 
      },
      { 
        title: "Cancelled", 
        value: `Rs.${totalCancelled.toLocaleString()}`, 
        icon: Ban, 
        detail: `${cancelledTrans.length} Voided Bills`, 
        colorClass: "text-muted-foreground" 
      },
      { 
        title: "Expenses", 
        value: `Rs.${totalExp.toLocaleString()}`, 
        icon: ArrowDownCircle, 
        detail: `${filteredData.expenses.length} Entries`, 
        colorClass: "text-destructive" 
      },
      { 
        title: "Est. Profit", 
        value: `Rs.${(totalSales - totalExp).toLocaleString()}`, 
        icon: IndianRupee, 
        detail: "Sales - Expenses", 
        isRevenue: true, 
        colorClass: "text-accent" 
      },
    ];
  }, [filteredData]);

  const topSellingItems = useMemo(() => {
    const itemCounts: Record<string, number> = {};
    filteredData.transactions.filter(t => t.paymentStatus === 'Paid').forEach(t => {
      t.items?.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
      });
    });
    return Object.entries(itemCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredData]);

  const handleCancelBill = () => {
    if (!db || !user || !transactionToCancel || !cancellationReason.trim()) return;
    const docRef = doc(db, 'users', user.uid, 'transactions', transactionToCancel);
    updateDocumentNonBlocking(docRef, { paymentStatus: 'Cancelled', cancellationReason: cancellationReason.trim() });
    toast({ title: "Bill Cancelled", description: "Transaction updated to Cancelled." });
    setTransactionToCancel(null);
    setCancellationReason('');
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64">
      <Sidebar />
      <MobileNav />
      <main className="p-6 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-headline font-bold">Business Overview</h2>
            <p className="text-muted-foreground">Track your income and expenditures.</p>
          </div>
          <Select value={timeRange} onValueChange={(v: TimeRange) => setTimeRange(v)}>
            <SelectTrigger className="w-[160px] bg-card border-none shadow-sm">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="1w">Last 7 Days</SelectItem>
              <SelectItem value="1m">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </header>

        {transLoading || !currentTime || !user ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, i) => (
                <Card key={i} className="border-none shadow-sm bg-card overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.title}</p>
                      <stat.icon className={`w-5 h-5 ${stat.colorClass} opacity-50`} />
                    </div>
                    <h3 className={`text-2xl font-bold font-headline ${stat.colorClass} mb-1`}>
                      {stat.isRevenue && !showRevenue ? "Rs. ••••••" : stat.value}
                    </h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-70">
                      {stat.detail}
                    </p>
                    {stat.isRevenue && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-4 h-6 text-[9px] uppercase font-bold px-0 hover:bg-transparent" 
                        onClick={() => setShowRevenue(!showRevenue)}
                      >
                        {showRevenue ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                        {showRevenue ? "Hide" : "Show"} Net Profit
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 border-none shadow-sm flex flex-col h-[640px]">
                <CardHeader className="flex flex-row items-center justify-between border-b border-muted/20">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    <CardTitle className="font-headline text-xl">Recent Activity</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest px-2 h-5 bg-primary/5 text-primary border-none">
                    Top 35 Recent
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 p-0 min-h-0">
                  <ScrollArea className="h-full w-full">
                    <div className="divide-y divide-muted/10">
                      {filteredData.transactions.slice(0, 35).map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors group h-[60px]">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-3 mb-0.5">
                              <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 whitespace-nowrap">
                                {sale.serialNumber || 'N/A'}
                              </span>
                              <p className="font-bold text-sm truncate max-w-[250px]">
                                {sale.items?.map(item => `${item.name} x${item.quantity}`).join(', ')}
                              </p>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                                <span>{sale.date ? format(new Date(sale.date), 'MMM dd • HH:mm') : 'N/A'}</span>
                                <span className="flex items-center gap-1">
                                  {sale.paymentMethod === 'Cash' ? <Banknote className="w-3 h-3 text-green-600" /> : <Wallet className="w-3 h-3 text-blue-600" />}
                                  {sale.paymentMethod}
                                </span>
                              </div>
                              {sale.paymentStatus === 'Cancelled' && sale.cancellationReason && (
                                <p className="text-[9px] text-destructive font-bold italic truncate max-w-[300px]" title={sale.cancellationReason}>
                                  Reason: {sale.cancellationReason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div className="flex flex-col items-end">
                              <p className={`font-bold text-sm leading-tight ${sale.paymentStatus === 'Cancelled' ? 'text-muted-foreground line-through' : 'text-accent'}`}>
                                Rs.{sale.finalAmount.toLocaleString()}
                              </p>
                              <Badge variant="outline" className={`text-[8px] border-none px-1.5 h-3.5 font-bold uppercase ${
                                sale.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {sale.paymentStatus}
                              </Badge>
                            </div>
                            {sale.paymentStatus !== 'Cancelled' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive md:opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setTransactionToCancel(sale.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm h-[640px] flex flex-col">
                <CardHeader className="border-b border-muted/20">
                  <CardTitle className="font-headline text-xl flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Top Sales
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                      {topSellingItems.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between p-3 bg-muted/5 rounded-lg border border-transparent hover:border-primary/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">#{index + 1}</span>
                            <p className="font-bold text-sm truncate max-w-[120px]">{item.name}</p>
                          </div>
                          <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] px-2 h-6">
                            <Package className="w-3 h-3 mr-1" />
                            {item.count} Sold
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>

      <AlertDialog open={!!transactionToCancel} onOpenChange={(open) => !open && setTransactionToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Cancel Bill?
            </AlertDialogTitle>
            <AlertDialogDescription>Provide a reason to mark this bill as cancelled.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label className="text-sm font-bold">Reason (Required)</Label>
            <Input placeholder="e.g. Incorrect order" value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelBill} disabled={!cancellationReason.trim()} className="bg-destructive hover:bg-destructive/90">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
