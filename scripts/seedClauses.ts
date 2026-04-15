import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	console.log("Re-seeding Clauses with independent sequences...");

	// Clear existing clauses to avoid confusion
	await prisma.clause.deleteMany({});

	// 1. APQP
	const apqp = await prisma.clauseCategory.findUnique({
		where: { name: "APQP" },
	});
	if (apqp) {
		const apqpClauses = [
			"APQP Procedure",
			"FMEA Procedure",
			"FMEA Review plan & its backup records",
			"APQP Matrix",
			"APQP Time Plan",
			"All activities To Be Matched between APQP Time Plan, APQP Procedure & APQP Matrix.",
			"APQP Time Plan Approved By Top Management",
			"Customer Events should be mentioned on APQP Time Plan",
			"Review Frequency Of CFT Leader As Well Top Management Defined In APQP Time Plan",
			"Signatures On APQP Time Plan ( CFT Leader & Top Management)",
			"MOM As Per Decided Frequency",
			"Micro Timing Plan Of Tool & Gauge.",
			"Delayed activities to be captured In APQP Time Plan",
			"Past Defect History/Lesson Learnt Sheet",
			"All Production Records, Inspection Records, Layout Inspection Report, Route Cards, NPD Tags, PDIR, Final Inspection Records, Invoices Of T0, T1,Tn, Pilot Samples.",
			"SPC, MSA, P & P Audit Plan",
			"SPC, MSA, P & P Audit Records",
			"Enquiry Register",
			"Enquiry Review Checksheet",
			"CFT Formation",
			"Technical, Team Feasibility, Risk Assessment",
			"Bill Of Material (BOM)",
			"PFD Prototype",
			"Spec meeting With Customer",
			"PFD Prelaunch",
			"Resource Planning sheet",
			"Prelaunch PFMEA",
			"Control Plan Prototype",
			"PDCA Sheet",
			"TGR, TGW Sheet",
			"Pre Launch Control Plan",
			"PCS, Final Insp. Std, PDIR Std.",
			"SST Reports (If reqd)",
			"3rd Part Testing Certificate",
			"Pilot Lot Feedback",
			"IPP Tags (NPD, ECN, PCN, Other)- Shop Floor",
			"IPP storage Lock & Key Area- Shop floor",
			"IPP Trial Tracking Sheet & IPP Log Book",
			"Development Completion Sign Off Sheet",
		];
		for (let i = 0; i < apqpClauses.length; i++) {
			await prisma.clause.create({
				data: {
					title: apqpClauses[i],
					order: i + 1,
					categoryId: apqp.id,
				},
			});
		}
	}

	// 2. ISC
	const isc = await prisma.clauseCategory.findUnique({
		where: { name: "ISC (Initial Supply Control)" },
	});
	if (isc) {
		const iscClauses = [
			"Initial Supply Control Procedure",
			"Initial Supply Index",
			"ISC Announcement Sheet",
			"Checksheet For Initial Control Phase",
			"Development Handover Checksheet NPD-->Prod",
			"Initial Supply Control (ISC) Tags- Separate for Internal & External use",
			"Daily Initial Supply Monitoring Checksheet",
			"Initial Supply Control Termination Sheet",
			"Initial supply control sign off sheet",
			"Initial supply control summary report",
		];
		for (let i = 0; i < iscClauses.length; i++) {
			await prisma.clause.create({
				data: {
					title: iscClauses[i],
					order: i + 1,
					categoryId: isc.id,
				},
			});
		}
	}

	console.log("Re-seeding completed!");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
