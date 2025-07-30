import { internal } from "./_generated/api";
import { query } from "./_generated/server";


// balance wala 
export const getUserBalance = query({

    handler: async (ctx) => {
        const user = await ctx.runQuery(internal.users.getCurrentUser);

        const expenses = (await ctx.db.query("expenses").collect()).filter(
            (e) => { !e.groupId && (e.paidByUserId === user._id || e.splits.some((s) => s.userId === user._id))
            }
        );

        let youOwe = 0;
        let youAreOwed = 0;
        const balanceByUser = {};

        for(const e of expenses)
        {
            const isPayer = e.paidByUserId === user._id;
            const mySplit = e.splits.find((s) => s.userId === user._id);

            if(isPayer)
            {
                for(const s of e.splits)
                {
                    // skip that which user's paid and that which he has already paid
                    if(s.userId === user._id || s.paid) continue;
                    youAreOwed += s.amount;

                    (balanceByUser[s.userId] ??= {owed: 0 , owing: 0}).owed += s.amount;
                }
            }
            else if(mySplit && !mySplit.paid)
            {
                // kisi ur ne diye hai to mujhe dene padenge
                youOwe += mySplit.amount;

                // jisne kiye hai uske account mai add kar do 
                (balanceByUser[e.paidByUserId] ??= {owed: 0 , owing: 0}).owing += mySplit.amount;
            }
        }

        const settlements = (await ctx.db.query("settlements").collect()).filter(
            (s) => !s.groupId && (s.paidByUserId === user._id || s.receivedByUserId === user._id)
        );

        for(const s of settlements)
        {
            if(s.paidByUserId === user._id)
            {
                // user ne kisi ur ko diye hai paise
                youOwe -= s.amount;
                (balanceByUser[s.receivedByUserId] ??= {owed: 0 , owing: 0}).owing -= s.amount;
            }
            else
            {
                // someone paid the used ..reduce karo unki taraf se 
                youAreOwed -= s.amount;
                (balanceByUser[s.paidByUserId] ??= {owed: 0 , owing: 0}).owed -= s.amount;
            }
        }

        // return arrays 
        const youOweList = [];
        const youAreOwedByList = [];

        for(const [uid , {owed , owing}] of Object.entries(balanceByUser))
        {
            const net = owed - owing;
            if(net === 0) continue;

            const counterpart = await ctx.db.get(uid);
            const base = {
                userId: uid,
                name: counterpart?.name ?? "Unknown",
                imageUrl: counterpart?.imageUrl,
                amount: Math.abs(net),
            };

            net > 0 ? youAreOwedByList.push(base) : youOweList.push(base);
        }


        youOweList.sort((a , b) => b.amount - a.amount);
        youAreOwedByList.sort((a, b) => b.amount - a.amount);


        return {
            youOwe, // total amount user owes
            youAreOwed, // total amount jo user se maangte h
            totalBalance: youAreOwed - youOwe, // net balance
            oweDetails: {youOwe: youOweList , youAreOwedBy: youAreOwedByList}, // detail
        };
    }

})

export const getTotalSpent = query({
    handler : async () => {
        const user = await ctx.runQuery(internal.users.getCurrentUser);

        const currentYear = new Date.getFullYear();
        const startOfYear = new Date(currentYear , 0 , 1).getTime();

        const expenses = await ctx.db.query("expenese").withIndex("by_date" , (q) => q.gte("date" , startOfYear));

        const userExpenses = expenses.filter((expense) => expense.paidByUserId === user._id || expense.splits.some((split) => split.userId === user._id))

        let totalSpent = 0;

        userExpenses.forEach((expense) => {
            const userSplit = expense.splits.find(
                (split) => split.userId === user._id);

            if (userSplit) {
                totalSpent += userSplit.amount;
            }    
        });
        return totalSpent;
    }
});

export const getMonthlySpending = query({

    handler: async (ctx) => {

        const user = await ctx.runQuery(internal.users.getCurrentUser);

        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear , 0 , 1).getTime();

        const allExpenses = await ctx.db.query("expenses").withIndex("by_date" , (q) => q.gte("date" , startOfYear)).collect();

        const userExpenses = allExpenses.filter(
            (expense) => expense.paidByUserId === user._id || expense.splits.some((split) => split.userId === user._id)
        );

        const monthlyTotals = {};

        for(let i = 0 ; i < 12 ; i++)
        {
            const monthDate = new Date(currentYear , i , 1);
            monthlyTotals[monthDate.getTime()] = 0;

        }

        userExpenses.forEach((expense) => {
            const date = new Date(expense.data);

            const monthStart = new Date(
                date.getFullYear(),
                date.getMonth(),
                1
            ).getTime();

            const userSplit = expense.splits.find(
                (split) => split.userId === user._id
            );

            if(userSplit) {
                monthlyTotals[monthStart] = (monthlyTotals[monthStart] || 0) + userSplit.amount;
            }

            const result = Object.entries(monthlyTotals).map(([month , total]) => ({
                month: parseInt(month),
                total,
            }));

            // sort by month
            result.sort((a , b) => a.month - b.month);

        })

        return result;
    }

});

export const getUserGroups = query({

    handler: async (ctx) => {
        const user = await ctx.runQuery(internal.users.getCurrentUser);

        const allGroups = await ctx.db.query("groups").collect();

        const groups = allGroups.filter((group) => 
            group.members.some((member) => member.userId === user._id)
        );
        
    }

});