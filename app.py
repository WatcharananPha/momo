import streamlit as st
import streamlit.components.v1 as components
import pandas as pd
from datetime import datetime, date
import plotly.express as px
import json

st.set_page_config(page_title="Cleaning Service Project Timeline", layout="wide")

st.markdown(
    """
<script src="https://cdn.tailwindcss.com"></script>
<style>
    .stDataFrame {width: 100%;}
</style>
""",
    unsafe_allow_html=True,
)

if "timeline_data" not in st.session_state:
    initial_data = [
        {
            "ID": 1,
            "Phase": "Week 1",
            "Category": "System Architecture & DB",
            "Task": "ออกแบบ Data Schema User Identity Skill Matrix และ Setup Cloud Infra",
            "Start Date": date(2026, 5, 10),
            "End Date": date(2026, 5, 16),
            "Status": "In Progress",
            "Progress (%)": 40,
            "Priority": "High",
            "Assignee": "Data Engineer",
        },
        {
            "ID": 2,
            "Phase": "Week 1",
            "Category": "Backend API",
            "Task": "วางโครงสร้าง Message Abstraction Layer WhatsApp WeChat Ready และ Chatbot Interface",
            "Start Date": date(2026, 5, 10),
            "End Date": date(2026, 5, 16),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "High",
            "Assignee": "Backend",
        },
        {
            "ID": 3,
            "Phase": "Week 2",
            "Category": "Customer LIFF",
            "Task": "พัฒนาระบบลงทะเบียน Guest Mode Membership และแจก Onboarding Point",
            "Start Date": date(2026, 5, 17),
            "End Date": date(2026, 5, 23),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "Medium",
            "Assignee": "Frontend Dev",
        },
        {
            "ID": 4,
            "Phase": "Week 2",
            "Category": "Customer LIFF",
            "Task": "พัฒนาระบบ Credit Wallet หน้าซื้อแพ็กเกจ Subscription และหน้า Transaction History",
            "Start Date": date(2026, 5, 17),
            "End Date": date(2026, 5, 23),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "High",
            "Assignee": "Frontend Dev",
        },
        {
            "ID": 5,
            "Phase": "Week 2-3",
            "Category": "Customer LIFF",
            "Task": "ปรับ Flow Booking เป็นแบบ Auto-Match Re-roll 3 ครั้ง และจ่ายด้วยเครดิต Payment Gateway",
            "Start Date": date(2026, 5, 19),
            "End Date": date(2026, 5, 30),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "High",
            "Assignee": "Fullstack Dev",
        },
        {
            "ID": 6,
            "Phase": "Week 3",
            "Category": "Customer LIFF",
            "Task": "พัฒนาระบบ Upload Slip ผ่าน Chat Tracking Real-time และระบบ Referral Link",
            "Start Date": date(2026, 5, 24),
            "End Date": date(2026, 5, 30),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "Medium",
            "Assignee": "Frontend Dev",
        },
        {
            "ID": 7,
            "Phase": "Week 4",
            "Category": "Maid Application",
            "Task": "สร้าง Flow Maid Onboarding พร้อมระบบ Pre-test และ UI แสดง Skill Matrix",
            "Start Date": date(2026, 5, 31),
            "End Date": date(2026, 6, 13),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "High",
            "Assignee": "Mobile Dev",
        },
        {
            "ID": 8,
            "Phase": "Week 4-5",
            "Category": "Maid Application",
            "Task": "พัฒนาหน้า Broadcast รับงาน First-come Job Instruction และปุ่มอัปเดต Status เรียลไทม์",
            "Start Date": date(2026, 6, 2),
            "End Date": date(2026, 6, 13),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "High",
            "Assignee": "Mobile Dev",
        },
        {
            "ID": 9,
            "Phase": "Week 5-6",
            "Category": "Backend API",
            "Task": "พัฒนา Core API Auto-Match Algorithm และระบบ Dynamic Tiering ปรับเรทค่าตัว",
            "Start Date": date(2026, 6, 14),
            "End Date": date(2026, 6, 27),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "High",
            "Assignee": "Backend",
        },
        {
            "ID": 10,
            "Phase": "Week 5-6",
            "Category": "Backend API",
            "Task": "พัฒนา Credit Engine Service to Credit Mapping และ Subscription Management State",
            "Start Date": date(2026, 6, 14),
            "End Date": date(2026, 6, 27),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "High",
            "Assignee": "Backend",
        },
        {
            "ID": 11,
            "Phase": "Week 6",
            "Category": "Backend API",
            "Task": "สร้าง Admin Web Dashboard Approve แม่บ้าน จัดการ Refund Campaign Scheduler",
            "Start Date": date(2026, 6, 21),
            "End Date": date(2026, 6, 27),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "Medium",
            "Assignee": "Fullstack Dev",
        },
        {
            "ID": 12,
            "Phase": "Week 5-6",
            "Category": "Backend API",
            "Task": "เชื่อมต่อ External Services SMS Gateway Line Messaging API Push Notification และ Line Webhook Slip",
            "Start Date": date(2026, 6, 14),
            "End Date": date(2026, 6, 27),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "High",
            "Assignee": "Backend",
        },
        {
            "ID": 13,
            "Phase": "Week 7",
            "Category": "CRM Gamification",
            "Task": "พัฒนาระบบประมวลผล Point Membership Tier Silver-Diamond และ Affiliate Link",
            "Start Date": date(2026, 6, 28),
            "End Date": date(2026, 7, 4),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "Low",
            "Assignee": "Fullstack Dev",
        },
        {
            "ID": 14,
            "Phase": "Week 7",
            "Category": "CRM Gamification",
            "Task": "พัฒนา Minigame Microservice Lucky Wheel สุ่มแจก Coupon Reward",
            "Start Date": date(2026, 6, 28),
            "End Date": date(2026, 7, 4),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "Low",
            "Assignee": "Backend",
        },
        {
            "ID": 15,
            "Phase": "Week 7",
            "Category": "Testing Deploy",
            "Task": "System Testing UAT และ Go-live",
            "Start Date": date(2026, 6, 28),
            "End Date": date(2026, 7, 4),
            "Status": "Pending",
            "Progress (%)": 0,
            "Priority": "High",
            "Assignee": "QA",
        },
    ]
    st.session_state.timeline_data = pd.DataFrame(initial_data)

st.title("Project Development Timeline Cleaning Service Line OA")
st.markdown(
    "ระบบวางแผนงาน เริ่มต้น 10 พฤษภาคม 2026 ระยะเวลา 8 สัปดาห์ สามารถดับเบิลคลิกที่ตารางเพื่อแก้ไข อัปเดตสถานะ หรือเพิ่มลบแถวแบบ Dynamic"
)

st.sidebar.header("Project Management Board")
st.sidebar.subheader("Filter Criteria")
    
all_assignees = st.session_state.timeline_data["Assignee"].unique().tolist()
all_priorities = st.session_state.timeline_data["Priority"].unique().tolist()
all_phases = st.session_state.timeline_data["Phase"].unique().tolist()

selected_assignees = st.sidebar.multiselect(
    "Filter by Assignee", options=all_assignees, default=all_assignees
)
selected_priorities = st.sidebar.multiselect(
    "Filter by Priority", options=all_priorities, default=all_priorities
)
selected_phases = st.sidebar.multiselect(
    "Filter by Sprint Phase", options=all_phases, default=all_phases
)

st.subheader("Task Management Data Grid")
edited_df = st.data_editor(
    st.session_state.timeline_data,
    num_rows="dynamic",
    use_container_width=True,
    hide_index=True,
    column_config={
        "ID": st.column_config.NumberColumn("ID", disabled=True),
        "Priority": st.column_config.SelectboxColumn(
            "Priority Level",
            options=["High", "Medium", "Low"],
            required=True,
        ),
        "Assignee": st.column_config.TextColumn("Assignee Name", required=True),
        "Status": st.column_config.SelectboxColumn(
            "Task Status",
            options=["Pending", "In Progress", "Review", "Completed", "Blocked"],
            required=True,
        ),
        "Progress (%)": st.column_config.ProgressColumn(
            "Progress",
            format="%f%%",
            min_value=0,
            max_value=100,
        ),
        "Start Date": st.column_config.DateColumn("Start Date", format="YYYY-MM-DD"),
        "End Date": st.column_config.DateColumn("End Date", format="YYYY-MM-DD"),
    },
)

st.session_state.timeline_data = edited_df

filtered_df = edited_df[
    (edited_df["Assignee"].isin(selected_assignees))
    & (edited_df["Priority"].isin(selected_priorities))
    & (edited_df["Phase"].isin(selected_phases))
]

st.divider()

st.subheader("Project Gantt Chart Master Plan")

df_gantt = filtered_df.copy()
if not df_gantt.empty:
    df_gantt["Task_Name"] = (
        df_gantt["Category"] + " " + df_gantt["Task"].str.slice(0, 35) + "..."
    )
    fig = px.timeline(
        df_gantt,
        x_start="Start Date",
        x_end="End Date",
        y="Phase",
        color="Status",
        hover_name="Task",
        hover_data=["Assignee", "Priority", "Progress (%)"],
        title="Gantt Chart Phase View",
        color_discrete_map={
            "Pending": "#94a3b8",
            "In Progress": "#3b82f6",
            "Review": "#8b5cf6",
            "Completed": "#10b981",
            "Blocked": "#ef4444",
        },
    )
    fig.update_yaxes(autorange="reversed")
    fig.update_layout(height=400, margin=dict(l=0, r=0, t=40, b=0))
    st.plotly_chart(fig, use_container_width=True)
else:
    st.info("ไม่มีข้อมูล Task ที่ตรงกับเงื่อนไขการ Filter ใน Gantt Chart")

st.divider()

st.subheader("Interactive Kanban Board Sprint View")

status_map = {
    "Pending": {"label": "Not started", "class": "bg-grey"},
    "In Progress": {"label": "In development", "class": "bg-blue"},
    "Blocked": {"label": "Testing", "class": "bg-pink"},
    "Review": {"label": "Reviewing", "class": "bg-purple"},
    "Completed": {"label": "Done", "class": "bg-green"},
}

categories = filtered_df["Category"].unique()

html_kanban = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
.notion-board { font-family: 'Inter', -apple-system, sans-serif; display: flex; gap: 20px; padding: 12px 0; overflow-x: auto; background: #ffffff; min-height: 600px; }
.notion-col { flex: 0 0 260px; display: flex; flex-direction: column; }
.notion-header-container { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.notion-pill { padding: 3px 10px; border-radius: 12px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; width: fit-content; }
.dot { font-size: 10px; }
.bg-grey { background: #E3E2E0; color: #32302C; }
.bg-blue { background: #D3E5EF; color: #183347; }
.bg-pink { background: #F4DFEB; color: #4C233F; }
.bg-purple { background: #E8DEEE; color: #412454; }
.bg-green { background: #DBEDDB; color: #1C3829; }
.notion-count { color: #787774; font-size: 14px; font-weight: 500; }
.notion-group { font-size: 14px; font-weight: 600; color: #37352F; margin: 8px 0 12px 0; display: flex; align-items: center; gap: 4px; padding-bottom: 4px; border-bottom: 1px solid #EDEDEC; }
.notion-card { background: white; border: 1px solid #EDEDEC; border-radius: 4px; padding: 12px; box-shadow: rgba(15, 15, 15, 0.05) 0px 1px 2px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 8px; cursor: pointer; transition: background 0.1s ease; }
.notion-card:hover { background: #F7F7F5; }
.notion-card-title { font-size: 14px; font-weight: 500; color: #37352F; line-height: 1.4; display: flex; gap: 6px; }
.notion-card-assignee { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #787774; }
.notion-avatar { width: 20px; height: 20px; border-radius: 50%; background: #9B9A97; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; }
.notion-tag { background: #F1F1EF; color: #37352F; padding: 2px 6px; border-radius: 4px; font-size: 12px; width: fit-content; }
.notion-date { font-size: 12px; color: #787774; }
</style>
<div class="notion-board">
"""

for status in ["Pending", "In Progress", "Blocked", "Review", "Completed"]:
    status_df = filtered_df[filtered_df["Status"] == status]
    count = len(status_df)
    s_info = status_map[status]

    html_kanban += f"""
    <div class="notion-col">
        <div class="notion-header-container">
            <div class="notion-pill {s_info["class"]}"><span class="dot">●</span> {s_info["label"]}</div>
            <span class="notion-count">{count}</span>
        </div>
    """

    for cat in categories:
        cat_df = status_df[status_df["Category"] == cat]
        if len(cat_df) > 0:
            html_kanban += f'<div class="notion-group">▼ {cat} <span style="color:#9B9A97; font-weight:400; font-size:12px; margin-left:4px">{len(cat_df)}</span></div>'

            for _, row in cat_df.iterrows():
                assignee = row.get("Assignee", "Unassigned")
                assignee_initials = str(assignee)[:2].upper()
                date_str = (
                    row.get("Start Date").strftime("%B %d, %Y")
                    if pd.notnull(row.get("Start Date"))
                    else ""
                )

                html_kanban += f"""
                <div class="notion-card" draggable="true">
                    <div class="notion-card-title">
                        <span style="color:#787774">▣</span>
                        <span>{row.get('Task', '')}</span>
                    </div>
                    <div class="notion-card-assignee">
                        <div class="notion-avatar">{assignee_initials}</div>
                        <span>{assignee}</span>
                    </div>
                    <div class="notion-tag">{row.get('Phase', 'Unknown')}</div>
                    <div class="notion-date">{date_str}</div>
                </div>
                """

    html_kanban += "</div>"

html_kanban += "</div>"

components.html(html_kanban, height=800, scrolling=True)

st.divider()
st.subheader("Project Calendar View")

events = []
color_mapping = {
    "Pending": "#94a3b8",
    "In Progress": "#3b82f6",
    "Review": "#8b5cf6",
    "Completed": "#10b981",
    "Blocked": "#ef4444",
}

for _, row in filtered_df.iterrows():
    start_date = (
        row["Start Date"].strftime("%Y-%m-%d")
        if pd.notnull(row["Start Date"])
        else None
    )
    end_date = (
        (row["End Date"] + pd.Timedelta(days=1)).strftime("%Y-%m-%d")
        if pd.notnull(row["End Date"])
        else None
    )
    if start_date:
        events.append(
            {
                "title": f"{row.get('Assignee', '')[:2]}: {row['Task'][:25]}...",
                "start": start_date,
                "end": end_date,
                "color": color_mapping.get(row["Status"], "#3b82f6"),
            }
        )

events_json = json.dumps(events)

html_calendar = f"""
<link href='https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.css' rel='stylesheet' />
<script src='https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js'></script>
<style>
  #calendar-container {{ background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; font-family: -apple-system, sans-serif; }}
  .fc-event {{ cursor: pointer; border-radius: 4px; padding: 2px 4px; font-size: 0.8em; border: none; font-weight: 500; }}
  .fc-toolbar-title {{ font-size: 1.25em !important; font-weight: 600; color: #1e293b; }}
  .fc-button-primary {{ background-color: #3b82f6 !important; border-color: #3b82f6 !important; text-transform: capitalize !important; }}
</style>
<div id='calendar-container'>
    <div id='calendar'></div>
</div>
<script>
  document.addEventListener('DOMContentLoaded', function() {{
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {{
      initialView: 'dayGridMonth',
      initialDate: '2026-05-01',
      headerToolbar: {{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek'
      }},
      events: {events_json},
      height: 650
    }});
    calendar.render();
  }});
</script>
"""

components.html(html_calendar, height=700, scrolling=True)

st.sidebar.divider()
st.sidebar.subheader("Sprint Analytics")

total_tasks = len(filtered_df)
completed_tasks = len(filtered_df[filtered_df["Status"] == "Completed"])
in_progress_tasks = len(filtered_df[filtered_df["Status"] == "In Progress"])

col1, col2 = st.sidebar.columns(2)
col1.metric("Filtered Tasks", total_tasks)
col2.metric("Completed", completed_tasks)

if total_tasks > 0:
    overall_progress = filtered_df["Progress (%)"].mean()
    st.sidebar.progress(overall_progress / 100)
    st.sidebar.caption(f"Velocity Completion {overall_progress:.1f}%")
else:
    st.sidebar.caption("No metrics available for selected filters")
