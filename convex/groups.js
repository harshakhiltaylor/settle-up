import { internal } from "./_generated/api"
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getGroupsExpenses  = query({

    args: {groupId: v.id("groups")},
    handler: async (ctx , {groupId}) => {
    
        const currentUser = await ctx.runQuery(internal.users.getCurrentUser);

        const group = await ctx.db.get(groupId);
        if(!group) throw new Error("Group Not Found");

        if(!group.members.some((m) => m.users === currentUser._id))
        {
            throw new Error("You are not a member of this group");
        }

        const expenses = await ctx.db.query("expenses").withIndex("by_group" , (q) => q.eq("groupId" , groupId)).collect();
        const settlements = await ctx.db.query("settlements").filter((q) => q.eq(q.field("groupId"), groupId)).collect();

        // member map
        
        const memberDetails = await Promise.all(
            group.members.map(async (m) => {
                const u = await ctx.db.get(m.userId);
                return {
                    id: u._id,
                    name: u.name,
                    imageUrl: u.imageUrl,
                    role: m.role,
                }
            })
        )

        const ids = memberDetails.map((m) => m.id);

        // balance calc
        // init total objects to track overall balance for each user 
        // format: {userId1: balance1 , ...}

        const totals = Object.fromEntries(ids.map((id) => [id,0]));


        // creating a 2D matrix of who owes whom 
        //ledger[a][b] = how much a owes b

        const ledger = {}

        ids.forEach((a) => {

            ledger[a] = {},
            ids.forEach((b) => {
                if(a != b) ledger[a][b] = 0;
            });
        });

        // apply expenses to balances 

        for(const exp of expenses)
        {
            const payer = exp.paidByUserId;
            for(const split of exp.split)
            {
                if(split.userId === payer || split.paid) continue;

                const debtor = split.userId;
                const amt = split.amount;

                totals[payer] += amt;
                totals[debtor] -= amt;

                ledger[debtor][payer] += amt;
            }
        }

        for(const s of settlements)
        {
            totals[s.paidByUserId] += s.amount;
            totals[s.receivedByUserId] -= s.amount;

            ledger[s.paidByUserId][s.receivedByUserId] -= s.amount;
        }

        const balances = memberDetails.map((m) => ({
            ...m,
            totalBalance: totals[m.id],
            owes: Object.entries(ledger[m.id]).filter(([,v]) =>  v > 0).map(([to , amount]) => ({to , amount})),
            owedBy: ids.filter((other) => ledger[other][m.id] > 0).map((other) => ({from: other , amount: ledger[other][m.id]})),
        }));

        const userLookUpMap = {};

        memberDetails.forEach((member) => {
            userLookUpMap[member.id] = member;
        })

        return {

            group: {
                id: group._id,
                name: group.name,
                decription: group.description,
            },

            members: memberDetails, // group member details
            expenses, // all expenses in this group
            settlements, // all settlements in this group
            balances, // calculated balance info for each member
            userLookUpMap, // quick lookup for user details
        };        
    }
})