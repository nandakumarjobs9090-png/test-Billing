"use client";

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Plus, Search, Trash2, Loader2, Inbox, 
  ReceiptIndianRupee, Calendar as CalendarIcon, Tag,
  CalendarDays, X
} from 'lucide-react';
import { Expense } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { format, isToday, isYesterday, subDays, subMonths, isAfter } from 'date-fns';

const EXPENSE_CATEGORIES = ['Raw Materials', 'Rent', 'Electricity', 'Salaries', 'Maintenance', 'Others'];
type TimeRange = 'all' | 'today' | 'yesterday' | '1w' | '1m' | '3m' | '6m';

export default function ExpensesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const expensesBaseRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'expenses');
  }, [db, user]);

  const expensesQuery = useMemoFirebase(() => {
    if (!expensesBaseRef) return null;
    return query(expensesBaseRef, orderBy('date', 'desc'));
  }, [expensesBaseRef]);
  
  const { data: expenses, loading } = useCollection<Expense>(expensesQuery);

  const [search, setSearch] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Raw Materials',
    date: ''
  });

  useEffect(() => {
    // Set initial date and current time on client to avoid hydration mismatch
    setFormData(prev => ({
      ...prev,
      date: format(new Date(), 'yyyy-MM-dd')
    }));
    setCurrentTime(new Date());
  }, []);

  const filteredExpenses = useMemo(() => {
    const allExp = expenses || [];
    
    return allExp.filter(e => {
      // Search filter
      const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase()) || 
                           e.category.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // Time range filter
      if (timeRange === 'all' || !currentTime || !e.date) return true;
      
      const expenseDate = new Date(e.date);
      switch (timeRange) {
        case 'today': return isToday(expenseDate);
        case 'yesterday': return isYesterday(expenseDate);
        case '1w': return isAfter(expenseDate, subDays(currentTime, 7));
        case '1m': return isAfter(expenseDate, subMonths(currentTime, 1));
        case '3m': return isAfter(expenseDate, subMonths(currentTime, 3));
        case '6m': return isAfter(expenseDate, subMonths(currentTime, 6));
        default: return true;
      }
    });
  }, [expenses, search, timeRange, currentTime]);

  const handleSaveExpense = () => {
    if (!db || !expensesBaseRef || !user) return;
    if (!formData.description || !formData.amount || !formData.date) {
      toast({ title: "Validation Error", description: "All fields are required.", variant: "destructive" });
      return;
    }

    // Parse date as local parts to avoid UTC timezone shift
    const [year, month, day] = formData.date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day, 12, 0, 0); 

    const expenseData = {
      description: formData.description,
      amount: Number(formData.amount),
      category: formData.category,
      date: localDate.toISOString(),
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(expensesBaseRef, expenseData);
    toast({ title: "Success", description: "Expense recorded." });
    setIsDialogOpen(false);
    setFormData({ 
      description: '', 
      amount: '', 
      category: 'Raw Materials', 
      date: format(new Date(), 'yyyy-MM-dd') 
    });
  };

  const handleDelete = (id: string) => {
    if (!db || !user) return;
    const docRef = doc(db, 'users', user.uid, 'expenses', id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Deleted", description: "Expense removed." });
  };

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64">
      <Sidebar />
      <MobileNav />
      <main className="p-6 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-headline font-bold">Expense Manager</h2>
            <p className="text-muted-foreground">Track your business costs and overheads.</p>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <Card className="bg-primary/5 border-none shadow-none px-6 py-2 flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Selected Period Total</p>
                <p className="text-xl font-bold text-primary">Rs.{totalExpenses.toLocaleString()}</p>
              </div>
              <ReceiptIndianRupee className="w-8 h-8 text-primary/40" />
            </Card>
            <Button className="bg-primary hover:bg-primary/90 h-12" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search expenses..." 
              className="pl-10 bg-card border-none shadow-sm h-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v: TimeRange) => setTimeRange(v)}>
              <SelectTrigger className="w-[180px] bg-card border-none shadow-sm h-11">
                <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expenses</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="1w">Last 7 Days</SelectItem>
                <SelectItem value="1m">Last 30 Days</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>
            {timeRange !== 'all' && (
              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setTimeRange('all')}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
            <Inbox className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No expenses found for this selection.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredExpenses.map((expense) => (
              <Card key={expense.id} className="border-none shadow-sm bg-card hover:bg-muted/5 transition-colors overflow-hidden group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-base">{expense.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-bold text-primary/60 uppercase tracking-tighter">
                          <Tag className="w-3 h-3" /> {expense.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" /> {expense.date ? format(new Date(expense.date), 'MMM dd, yyyy') : '...'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <p className="text-lg font-bold text-accent">Rs.{expense.amount.toLocaleString()}</p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(expense.id!)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Record Expense</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Input 
                  id="desc" 
                  placeholder="e.g. 50 Litres Milk" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount (Rs.)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="500" 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <Button 
                      key={cat}
                      type="button"
                      variant={formData.category === cat ? 'default' : 'outline'}
                      size="sm"
                      className="text-[10px] h-7 px-2 rounded-full font-bold uppercase"
                      onClick={() => setFormData({...formData, category: cat})}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveExpense} className="w-full h-11 text-lg font-bold">
                Save Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
