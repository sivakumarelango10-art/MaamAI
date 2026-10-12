import datetime
from sqlalchemy.orm import Session
from app.models import (
    User,
    OAuthConnection,
    Briefing,
    Email,
    AIDraft,
    CalendarEvent,
    Task,
    ActivityLog,
    SystemSetting,
)
from app.auth import hash_password

def seed_database(db: Session, force: bool = False):
    """Seed SQLite database with two independent academic staff members."""
    if not force and db.query(User).first():
        return

    if force:
        db.query(ActivityLog).delete()
        db.query(AIDraft).delete()
        db.query(Email).delete()
        db.query(CalendarEvent).delete()
        db.query(Task).delete()
        db.query(Briefing).delete()
        db.query(SystemSetting).delete()
        db.query(OAuthConnection).delete()
        db.query(User).delete()
        db.commit()

    # =========================================================================
    # STAFF MEMBER 1: Dr. Aris Vance (Systems & Distributed Computing)
    # =========================================================================
    user_aris = User(
        email="aris.vance@university.edu",
        username="aris_vance",
        hashed_password=hash_password("Password123!"),
        full_name="Dr. Aris Vance",
        role="Associate Professor of Computer Science",
        department="School of Interactive Computing",
        avatar_initials="AV",
        is_active=True,
    )
    db.add(user_aris)
    db.commit()
    db.refresh(user_aris)

    # Aris OAuth (Simulated Phase 1 connector)
    oauth_aris = OAuthConnection(
        user_id=user_aris.id,
        provider="google",
        email_account="aris.vance@university.edu",
        is_connected=False,
    )
    db.add(oauth_aris)

    # Aris Briefing
    briefing_aris = Briefing(
        user_id=user_aris.id,
        date=datetime.datetime.now().strftime("%A, %B %d, %Y"),
        greeting="Good morning, Dr. Vance",
        quote="“Simplicity is prerequisite for reliability.” — Edsger W. Dijkstra",
        summary=(
            "You have 2 scheduled lectures, 1 faculty committee meeting, and office hours today. "
            "MaamAI flagged 2 urgent emails requiring immediate attention, including an NSF grant budget "
            "revision due Thursday and a doctoral recommendation request. 3 AI drafts are prepared and awaiting your review."
        ),
        key_focus="Deliver CS 4400 Lecture at 09:30 AM; Review NSF Grant compute budget with Marcus; Review 3 pending AI draft replies; Hold student office hours at 11:30 AM",
        urgent_count=2,
        meetings_count=4,
        tasks_count=5,
    )
    db.add(briefing_aris)

    # Aris Emails
    email_a1 = Email(
        user_id=user_aris.id,
        sender_name="Sarah Chen (Grad Student)",
        sender_email="schen42@university.edu",
        subject="Recommendation Letter Request for Ph.D. Applications",
        snippet="Dear Dr. Vance, I hope you are having a good semester. I am preparing applications for Ph.D. programs in Distributed Systems...",
        body=(
            "Dear Dr. Vance,\n\n"
            "I hope you are having a productive semester. As I complete my master's thesis work on distributed consensus under your advising, "
            "I am preparing applications for Ph.D. programs for the upcoming cycle (MIT, Berkeley, and ETH Zurich). "
            "The earliest submission deadline is December 1st.\n\n"
            "Would you be willing to write a strong letter of recommendation on my behalf?\n\n"
            "Best regards,\nSarah Chen"
        ),
        category="Student Inquiries",
        priority="high",
        is_read=False,
        has_draft=True,
        received_at="Today, 08:15 AM",
        demo_label="[Demo Data - Sample Faculty Inbox]",
    )

    email_a2 = Email(
        user_id=user_aris.id,
        sender_name="Dr. Marcus Thorne (Co-PI)",
        sender_email="m.thorne@mit.edu",
        subject="URGENT: NSF CNS Grant Compute Budget Allocation Revision",
        snippet="Aris, Program Director asked for a revised justification for GPU cluster compute hours by Thursday 5 PM...",
        body=(
            "Hi Aris,\n\n"
            "The NSF Program Director reached out regarding our collaborative CNS proposal. They need a revised budget breakdown "
            "and compute justification for the cloud GPU hours by this Thursday at 5:00 PM EST.\n\n"
            "Can we review the revised Section 3 numbers during our sync at 2:00 PM today?\n\n"
            "Best,\nMarcus"
        ),
        category="Grants",
        priority="high",
        is_read=False,
        has_draft=True,
        received_at="Today, 07:45 AM",
        demo_label="[Demo Data - Sample Faculty Inbox]",
    )

    email_a3 = Email(
        user_id=user_aris.id,
        sender_name="Prof. Eleanor Rigby (Dept Head)",
        sender_email="e.rigby@university.edu",
        subject="Curriculum Committee Agenda - New Systems Track",
        snippet="Colleagues, Please review the proposed course additions for the undergraduate Systems track before our meeting...",
        body="Attached is the draft agenda for our Senate Curriculum meeting this afternoon at 3:30 PM in the Dean's Boardroom.",
        category="Department",
        priority="medium",
        is_read=True,
        has_draft=False,
        received_at="Yesterday, 04:30 PM",
        demo_label="[Demo Data - Sample Faculty Inbox]",
    )

    db.add_all([email_a1, email_a2, email_a3])
    db.commit()

    # Aris AI Drafts
    draft_a1 = AIDraft(
        user_id=user_aris.id,
        email_id=email_a1.id,
        recipient="Sarah Chen <schen42@university.edu>",
        subject="Re: Recommendation Letter Request for Ph.D. Applications",
        body=(
            "Dear Sarah,\n\n"
            "I would be glad to write a strong letter of recommendation for your doctoral applications. "
            "Your research on distributed consensus benchmarks has been exceptional.\n\n"
            "Please send me a spreadsheet with the target universities and submission deadlines two weeks in advance.\n\n"
            "Best regards,\nDr. Aris Vance"
        ),
        tone="Encouraging & Academic",
        status="pending_review",
        confidence_score=0.96,
        demo_label="[Demo - AI Proposed Response]",
    )

    draft_a2 = AIDraft(
        user_id=user_aris.id,
        email_id=email_a2.id,
        recipient="Dr. Marcus Thorne <m.thorne@mit.edu>",
        subject="Re: URGENT: NSF CNS Grant Compute Budget Allocation Revision",
        body=(
            "Hi Marcus,\n\n"
            "Thanks for the heads up. Yes, let's prioritize Section 3 during our 2:00 PM sync today. "
            "I have already pulled our lab's revised node hour estimates.\n\n"
            "Best,\nAris"
        ),
        tone="Direct & Professional",
        status="pending_review",
        confidence_score=0.93,
        demo_label="[Demo - AI Proposed Response]",
    )

    db.add_all([draft_a1, draft_a2])

    # Aris Calendar
    events_aris = [
        CalendarEvent(
            user_id=user_aris.id,
            title="CS 4400: Distributed Systems (Lecture 14)",
            start_time="09:30 AM",
            end_time="10:45 AM",
            date_str="Today",
            location="Hall C / Room 204",
            event_type="lecture",
            attendee_count=85,
            notes="Topic: Raft Consensus vs Multi-Paxos.",
            demo_label="[Demo Data - Academic Schedule]",
        ),
        CalendarEvent(
            user_id=user_aris.id,
            title="Faculty Office Hours (Open Drop-in)",
            start_time="11:30 AM",
            end_time="01:00 PM",
            date_str="Today",
            location="Turing Hall 312",
            event_type="office_hours",
            attendee_count=6,
            notes="Midterm exam reviews.",
            demo_label="[Demo Data - Academic Schedule]",
        ),
        CalendarEvent(
            user_id=user_aris.id,
            title="NSF CNS Project Sync with MIT Team",
            start_time="02:00 PM",
            end_time="03:00 PM",
            date_str="Today",
            location="Virtual / Zoom Room 4",
            event_type="colloquium",
            attendee_count=4,
            notes="Urgent compute budget revision.",
            demo_label="[Demo Data - Academic Schedule]",
        ),
    ]
    db.add_all(events_aris)

    # Aris Tasks
    tasks_aris = [
        Task(
            user_id=user_aris.id,
            title="Review & submit revised NSF compute budget justification",
            description="Coordinate with Marcus on compute hours before Thursday 5 PM.",
            category="Grants",
            due_date="Today, 05:00 PM",
            priority="high",
            status="in_progress",
            demo_label="[Demo Data - Faculty Checklist]",
        ),
        Task(
            user_id=user_aris.id,
            title="Review pending AI draft response for Sarah Chen Ph.D. letter",
            description="Confirm program deadlines.",
            category="Academic",
            due_date="Today",
            priority="high",
            status="pending",
            demo_label="[Demo Data - Faculty Checklist]",
        ),
    ]
    db.add_all(tasks_aris)

    # Aris Activity Logs
    logs_aris = [
        ActivityLog(
            user_id=user_aris.id,
            title="MaamAI Daily Briefing Prepared",
            description="Synthesized 3 sessions and 2 urgent communications for Dr. Vance.",
            category="system",
        ),
        ActivityLog(
            user_id=user_aris.id,
            title="Generated 2 AI Draft Replies",
            description="Proposals drafted for graduate recommendation and NSF grant revision.",
            category="ai_draft",
        ),
    ]
    db.add_all(logs_aris)

    # Aris Settings
    settings_aris = [
        SystemSetting(user_id=user_aris.id, key="faculty_name", value="Dr. Aris Vance"),
        SystemSetting(user_id=user_aris.id, key="faculty_role", value="Associate Professor of Computer Science"),
        SystemSetting(user_id=user_aris.id, key="faculty_email", value="aris.vance@university.edu"),
        SystemSetting(user_id=user_aris.id, key="faculty_department", value="School of Interactive Computing"),
        SystemSetting(user_id=user_aris.id, key="office_hours_default", value="Tuesday & Thursday 11:30 AM - 01:00 PM (Turing Hall 312)"),
        SystemSetting(user_id=user_aris.id, key="ai_tone_preference", value="Warm, Academic, Professional"),
        SystemSetting(user_id=user_aris.id, key="dark_mode_default", value="true"),
        SystemSetting(user_id=user_aris.id, key="email_integration_status", value="Isolated User Workspace (Phase 2 Gmail Ready)"),
        SystemSetting(user_id=user_aris.id, key="calendar_integration_status", value="Isolated User Workspace (Phase 2 GCal Ready)"),
    ]
    db.add_all(settings_aris)
    db.commit()

    # =========================================================================
    # STAFF MEMBER 2: Dr. Priya Sharma (AI & Machine Learning Institute)
    # =========================================================================
    user_priya = User(
        email="priya.sharma@university.edu",
        username="priya_sharma",
        hashed_password=hash_password("Password123!"),
        full_name="Dr. Priya Sharma",
        role="Assistant Professor of Machine Learning",
        department="Data Science & Machine Learning Institute",
        avatar_initials="PS",
        is_active=True,
    )
    db.add(user_priya)
    db.commit()
    db.refresh(user_priya)

    # Priya OAuth
    oauth_priya = OAuthConnection(
        user_id=user_priya.id,
        provider="google",
        email_account="priya.sharma@university.edu",
        is_connected=False,
    )
    db.add(oauth_priya)

    # Priya Briefing
    briefing_priya = Briefing(
        user_id=user_priya.id,
        date=datetime.datetime.now().strftime("%A, %B %d, %Y"),
        greeting="Good morning, Dr. Sharma",
        quote="“Learning without thought is labor lost; thought without learning is perilous.” — Confucius",
        summary=(
            "You have 1 core lecture (DS 3100 Deep Learning), lab advising hours, and an industry partnership "
            "meeting with Google DeepMind today. MaamAI flagged 1 urgent graduate advising inquiry regarding "
            "lab GPU cluster quotas, and 2 AI response proposals are prepared for your review."
        ),
        key_focus="Deliver DS 3100 Lecture at 10:00 AM; Review DeepMind fellowship shortlist; Review student GPU quota request from Rohan; Hold Lab office hours at 01:30 PM",
        urgent_count=1,
        meetings_count=4,
        tasks_count=3,
    )
    db.add(briefing_priya)

    # Priya Emails
    email_p1 = Email(
        user_id=user_priya.id,
        sender_name="Rohan Patel (Graduate Researcher)",
        sender_email="rpatel9@university.edu",
        subject="Request for Extra H100 GPU Quota for Vision-Language Pretraining",
        snippet="Dear Dr. Sharma, our checkpoint ablation on diffusion transformers requires 120 additional GPU hours...",
        body=(
            "Dear Dr. Sharma,\n\n"
            "I hope your week is going well. Our team has finalized the baseline models for the upcoming CVPR deadline. "
            "To complete the ablation studies on multi-modal tokenizers, our Slurm job allocation needs an additional "
            "120 GPU hours on the departmental cluster.\n\n"
            "Could you approve this extension with the cluster administrators?\n\n"
            "Best,\nRohan Patel"
        ),
        category="Student Inquiries",
        priority="high",
        is_read=False,
        has_draft=True,
        received_at="Today, 08:45 AM",
        demo_label="[Demo Data - Sample Faculty Inbox]",
    )

    email_p2 = Email(
        user_id=user_priya.id,
        sender_name="Dr. Elena Rostova (Google DeepMind Liaison)",
        sender_email="e.rostova@google.com",
        subject="AI Fellowship Committee: Shortlist Review Meeting Confirmation",
        snippet="Hi Priya, Looking forward to our 5 PM call to finalize the doctoral fellowship recipients...",
        body=(
            "Hi Priya,\n\n"
            "Thank you for reviewing the candidate portfolios. Looking forward to our committee sync this afternoon "
            "at 5:00 PM to finalize the 2 sponsored doctoral fellowship recipients for 2026.\n\n"
            "See you on the call!\n\n"
            "Elena"
        ),
        category="Research",
        priority="medium",
        is_read=False,
        has_draft=True,
        received_at="Today, 09:10 AM",
        demo_label="[Demo Data - Sample Faculty Inbox]",
    )

    email_p3 = Email(
        user_id=user_priya.id,
        sender_name="Dean's Office (Academic Affairs)",
        sender_email="academic.affairs@university.edu",
        subject="Reminder: Annual Graduate Admissions Review Panel",
        snippet="Dear Faculty Reviewers, The graduate admissions committee convenes today at 3:30 PM...",
        body="Dear Faculty Reviewers, Please ensure your applicant evaluations are submitted into the portal before 3:30 PM.",
        category="Department",
        priority="low",
        is_read=True,
        has_draft=False,
        received_at="Yesterday, 05:00 PM",
        demo_label="[Demo Data - Sample Faculty Inbox]",
    )

    db.add_all([email_p1, email_p2, email_p3])
    db.commit()

    # Priya AI Drafts
    draft_p1 = AIDraft(
        user_id=user_priya.id,
        email_id=email_p1.id,
        recipient="Rohan Patel <rpatel9@university.edu>",
        subject="Re: Request for Extra H100 GPU Quota for Vision-Language Pretraining",
        body=(
            "Dear Rohan,\n\n"
            "I have reviewed your checkpoint results. The ablation plan looks sound. I will sign off on the 120-hour cluster quota extension "
            "with SysAdmin this morning. Please make sure to monitor checkpoint storage cleanup.\n\n"
            "Best regards,\nDr. Priya Sharma"
        ),
        tone="Encouraging & Direct",
        status="pending_review",
        confidence_score=0.95,
        demo_label="[Demo - AI Proposed Response]",
    )

    draft_p2 = AIDraft(
        user_id=user_priya.id,
        email_id=email_p2.id,
        recipient="Dr. Elena Rostova <e.rostova@google.com>",
        subject="Re: AI Fellowship Committee: Shortlist Review Meeting Confirmation",
        body=(
            "Hi Elena,\n\n"
            "Confirmed. I have finished ranking the top 4 candidates and look forward to our discussion at 5:00 PM.\n\n"
            "Warm regards,\nPriya"
        ),
        tone="Professional & Collaborative",
        status="pending_review",
        confidence_score=0.97,
        demo_label="[Demo - AI Proposed Response]",
    )

    db.add_all([draft_p1, draft_p2])

    # Priya Calendar
    events_priya = [
        CalendarEvent(
            user_id=user_priya.id,
            title="DS 3100: Deep Learning Architectures (Lecture 8)",
            start_time="10:00 AM",
            end_time="11:15 AM",
            date_str="Today",
            location="Auditorium 101",
            event_type="lecture",
            attendee_count=110,
            notes="Topic: Attention Mechanisms & Transformer Backbones.",
            demo_label="[Demo Data - Academic Schedule]",
        ),
        CalendarEvent(
            user_id=user_priya.id,
            title="AI Lab Research Drop-in & Office Hours",
            start_time="01:30 PM",
            end_time="03:00 PM",
            date_str="Today",
            location="Ada Lovelace Hall 204",
            event_type="office_hours",
            attendee_count=8,
            notes="Student project milestones.",
            demo_label="[Demo Data - Academic Schedule]",
        ),
        CalendarEvent(
            user_id=user_priya.id,
            title="Graduate Admissions Committee Panel",
            start_time="03:30 PM",
            end_time="04:30 PM",
            date_str="Today",
            location="Conference Room B",
            event_type="meeting",
            attendee_count=6,
            notes="Ph.D. applicant evaluations.",
            demo_label="[Demo Data - Academic Schedule]",
        ),
        CalendarEvent(
            user_id=user_priya.id,
            title="Google DeepMind Fellowship Selection Sync",
            start_time="05:00 PM",
            end_time="06:00 PM",
            date_str="Today",
            location="Virtual / Meet",
            event_type="colloquium",
            attendee_count=5,
            notes="Final fellowship candidate selections.",
            demo_label="[Demo Data - Academic Schedule]",
        ),
    ]
    db.add_all(events_priya)

    # Priya Tasks
    tasks_priya = [
        Task(
            user_id=user_priya.id,
            title="Submit GPU cluster quota authorization for Rohan's Slurm job",
            description="Send ticket to cluster sysadmin for 120 H100 compute hours.",
            category="Research",
            due_date="Today, 11:30 AM",
            priority="high",
            status="pending",
            demo_label="[Demo Data - Faculty Checklist]",
        ),
        Task(
            user_id=user_priya.id,
            title="Finalize DeepMind doctoral fellowship candidate rankings",
            description="Prepare comparative summary for 5 PM sync.",
            category="Research",
            due_date="Today, 04:30 PM",
            priority="high",
            status="in_progress",
            demo_label="[Demo Data - Faculty Checklist]",
        ),
        Task(
            user_id=user_priya.id,
            title="Review 8 Ph.D. applicant portfolios for admissions committee",
            description="Submit rubric scores before 3:30 PM meeting.",
            category="Department",
            due_date="Today, 03:00 PM",
            priority="medium",
            status="pending",
            demo_label="[Demo Data - Faculty Checklist]",
        ),
    ]
    db.add_all(tasks_priya)

    # Priya Activity
    logs_priya = [
        ActivityLog(
            user_id=user_priya.id,
            title="MaamAI Daily Briefing Prepared",
            description="Synthesized 4 sessions and 1 urgent lab inquiry for Dr. Sharma.",
            category="system",
        ),
        ActivityLog(
            user_id=user_priya.id,
            title="Generated 2 AI Draft Replies",
            description="Proposals drafted for GPU allocation and fellowship sync.",
            category="ai_draft",
        ),
    ]
    db.add_all(logs_priya)

    # Priya Settings
    settings_priya = [
        SystemSetting(user_id=user_priya.id, key="faculty_name", value="Dr. Priya Sharma"),
        SystemSetting(user_id=user_priya.id, key="faculty_role", value="Assistant Professor of Machine Learning"),
        SystemSetting(user_id=user_priya.id, key="faculty_email", value="priya.sharma@university.edu"),
        SystemSetting(user_id=user_priya.id, key="faculty_department", value="Data Science & Machine Learning Institute"),
        SystemSetting(user_id=user_priya.id, key="office_hours_default", value="Monday & Wednesday 01:30 PM - 03:00 PM (Ada Lovelace 204)"),
        SystemSetting(user_id=user_priya.id, key="ai_tone_preference", value="Direct, Concise & Objective"),
        SystemSetting(user_id=user_priya.id, key="dark_mode_default", value="true"),
        SystemSetting(user_id=user_priya.id, key="email_integration_status", value="Isolated User Workspace (Phase 2 Gmail Ready)"),
        SystemSetting(user_id=user_priya.id, key="calendar_integration_status", value="Isolated User Workspace (Phase 2 GCal Ready)"),
    ]
    db.add_all(settings_priya)
    db.commit()
