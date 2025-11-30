"""
Email MCP Server for local desktop email clients.

Supports:
- Thunderbird (mbox format in profile directory)
- Apple Mail (emlx format in ~/Library/Mail)
- Generic IMAP/SMTP for any email provider

This MCP server provides tools for:
- Reading emails
- Searching emails
- Sending emails (via SMTP)
- Managing folders
"""

import os
import sys
import json
import email
import mailbox
import glob
import smtplib
import imaplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import decode_header
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("email_mcp")

# Configuration - will be set via environment or config file
EMAIL_CONFIG = {
    "client_type": os.environ.get("EMAIL_CLIENT_TYPE", "thunderbird"),  # thunderbird, apple_mail, imap
    "thunderbird_profile": os.environ.get("THUNDERBIRD_PROFILE", ""),
    "apple_mail_path": os.environ.get("APPLE_MAIL_PATH", "~/Library/Mail"),
    "imap_server": os.environ.get("IMAP_SERVER", ""),
    "imap_port": int(os.environ.get("IMAP_PORT", "993")),
    "smtp_server": os.environ.get("SMTP_SERVER", ""),
    "smtp_port": int(os.environ.get("SMTP_PORT", "587")),
    "email_address": os.environ.get("EMAIL_ADDRESS", ""),
    "email_password": os.environ.get("EMAIL_PASSWORD", ""),
}


def decode_mime_header(header_value: str) -> str:
    """Decode MIME encoded header values."""
    if not header_value:
        return ""
    decoded_parts = decode_header(header_value)
    result = []
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            result.append(part.decode(encoding or 'utf-8', errors='replace'))
        else:
            result.append(part)
    return ' '.join(result)


def find_thunderbird_profile() -> Optional[str]:
    """Find the default Thunderbird profile directory."""
    if EMAIL_CONFIG["thunderbird_profile"]:
        return os.path.expanduser(EMAIL_CONFIG["thunderbird_profile"])

    # Common locations
    if sys.platform == "darwin":
        base = os.path.expanduser("~/Library/Thunderbird/Profiles")
    elif sys.platform == "win32":
        base = os.path.expandvars(r"%APPDATA%\Thunderbird\Profiles")
    else:  # Linux
        base = os.path.expanduser("~/.thunderbird")

    if not os.path.exists(base):
        return None

    # Find default profile (usually ends with .default or .default-release)
    for entry in os.listdir(base):
        if entry.endswith(".default") or entry.endswith(".default-release"):
            return os.path.join(base, entry)

    # Just return first profile if no default found
    entries = os.listdir(base)
    if entries:
        return os.path.join(base, entries[0])

    return None


def get_thunderbird_mailboxes(profile_path: str) -> List[Dict[str, str]]:
    """Get list of mailbox files in Thunderbird profile."""
    mailboxes = []
    mail_dir = os.path.join(profile_path, "Mail")
    imap_dir = os.path.join(profile_path, "ImapMail")

    for base_dir in [mail_dir, imap_dir]:
        if not os.path.exists(base_dir):
            continue
        for root, dirs, files in os.walk(base_dir):
            for f in files:
                # Thunderbird mbox files don't have extensions
                # Skip .msf files (index files)
                if not f.endswith('.msf') and not f.startswith('.'):
                    filepath = os.path.join(root, f)
                    # Check if it's likely an mbox file
                    if os.path.isfile(filepath):
                        rel_path = os.path.relpath(filepath, base_dir)
                        mailboxes.append({
                            "name": rel_path,
                            "path": filepath,
                            "type": "mbox"
                        })
    return mailboxes


def read_mbox_emails(mbox_path: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Read emails from an mbox file."""
    emails = []
    try:
        mbox = mailbox.mbox(mbox_path)
        all_messages = list(mbox)

        # Get slice
        messages = all_messages[offset:offset + limit]

        for msg in messages:
            email_data = {
                "subject": decode_mime_header(msg.get("Subject", "")),
                "from": decode_mime_header(msg.get("From", "")),
                "to": decode_mime_header(msg.get("To", "")),
                "date": msg.get("Date", ""),
                "message_id": msg.get("Message-ID", ""),
            }

            # Get body (prefer plain text)
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        payload = part.get_payload(decode=True)
                        if payload:
                            body = payload.decode('utf-8', errors='replace')
                        break
            else:
                payload = msg.get_payload(decode=True)
                if payload:
                    body = payload.decode('utf-8', errors='replace')

            email_data["body"] = body[:2000] if body else ""  # Truncate for safety
            email_data["body_truncated"] = len(body) > 2000 if body else False
            emails.append(email_data)

        mbox.close()
    except Exception as e:
        return [{"error": str(e)}]

    return emails


def search_mbox_emails(mbox_path: str, query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Search emails in an mbox file."""
    results = []
    query_lower = query.lower()

    try:
        mbox = mailbox.mbox(mbox_path)

        for msg in mbox:
            subject = decode_mime_header(msg.get("Subject", ""))
            from_addr = decode_mime_header(msg.get("From", ""))

            # Get body for searching
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        payload = part.get_payload(decode=True)
                        if payload:
                            body = payload.decode('utf-8', errors='replace')
                        break
            else:
                payload = msg.get_payload(decode=True)
                if payload:
                    body = payload.decode('utf-8', errors='replace')

            # Search in subject, from, and body
            if (query_lower in subject.lower() or
                query_lower in from_addr.lower() or
                query_lower in body.lower()):
                results.append({
                    "subject": subject,
                    "from": from_addr,
                    "to": decode_mime_header(msg.get("To", "")),
                    "date": msg.get("Date", ""),
                    "message_id": msg.get("Message-ID", ""),
                    "body_preview": body[:500] if body else ""
                })

                if len(results) >= limit:
                    break

        mbox.close()
    except Exception as e:
        return [{"error": str(e)}]

    return results


# ============== MCP Tools ==============

@mcp.tool()
async def list_email_folders() -> str:
    """
    List available email folders/mailboxes from the configured email client.

    Returns:
        JSON list of available mailboxes with their paths.
    """
    client_type = EMAIL_CONFIG["client_type"]

    if client_type == "thunderbird":
        profile = find_thunderbird_profile()
        if not profile:
            return json.dumps({"error": "Thunderbird profile not found"})

        mailboxes = get_thunderbird_mailboxes(profile)
        return json.dumps({"folders": mailboxes, "profile": profile})

    elif client_type == "imap":
        try:
            imap = imaplib.IMAP4_SSL(EMAIL_CONFIG["imap_server"], EMAIL_CONFIG["imap_port"])
            imap.login(EMAIL_CONFIG["email_address"], EMAIL_CONFIG["email_password"])
            status, folders = imap.list()
            imap.logout()

            folder_list = []
            for folder in folders:
                if isinstance(folder, bytes):
                    folder_list.append(folder.decode('utf-8'))
                else:
                    folder_list.append(str(folder))

            return json.dumps({"folders": folder_list})
        except Exception as e:
            return json.dumps({"error": str(e)})

    return json.dumps({"error": f"Unsupported client type: {client_type}"})


@mcp.tool()
async def read_emails(folder: str, limit: int = 20, offset: int = 0) -> str:
    """
    Read emails from a specified folder.

    Args:
        folder: The folder/mailbox path to read from
        limit: Maximum number of emails to return (default 20)
        offset: Number of emails to skip (default 0)

    Returns:
        JSON list of emails with subject, from, to, date, and body preview.
    """
    client_type = EMAIL_CONFIG["client_type"]

    if client_type == "thunderbird":
        # folder should be the full path to the mbox file
        if os.path.exists(folder):
            emails = read_mbox_emails(folder, limit, offset)
            return json.dumps({"emails": emails, "count": len(emails)})
        else:
            return json.dumps({"error": f"Mailbox not found: {folder}"})

    elif client_type == "imap":
        try:
            imap = imaplib.IMAP4_SSL(EMAIL_CONFIG["imap_server"], EMAIL_CONFIG["imap_port"])
            imap.login(EMAIL_CONFIG["email_address"], EMAIL_CONFIG["email_password"])
            imap.select(folder)

            status, messages = imap.search(None, "ALL")
            email_ids = messages[0].split()

            # Get latest emails (reverse order)
            email_ids = email_ids[-(offset + limit):][::-1][offset:offset + limit]

            emails = []
            for eid in email_ids:
                status, msg_data = imap.fetch(eid, "(RFC822)")
                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)

                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            payload = part.get_payload(decode=True)
                            if payload:
                                body = payload.decode('utf-8', errors='replace')
                            break
                else:
                    payload = msg.get_payload(decode=True)
                    if payload:
                        body = payload.decode('utf-8', errors='replace')

                emails.append({
                    "subject": decode_mime_header(msg.get("Subject", "")),
                    "from": decode_mime_header(msg.get("From", "")),
                    "to": decode_mime_header(msg.get("To", "")),
                    "date": msg.get("Date", ""),
                    "body": body[:2000] if body else ""
                })

            imap.logout()
            return json.dumps({"emails": emails, "count": len(emails)})
        except Exception as e:
            return json.dumps({"error": str(e)})

    return json.dumps({"error": f"Unsupported client type: {client_type}"})


@mcp.tool()
async def search_emails(query: str, folder: Optional[str] = None, limit: int = 20) -> str:
    """
    Search emails by keyword in subject, from, or body.

    Args:
        query: Search query string
        folder: Optional folder to search in (searches all if not specified)
        limit: Maximum number of results (default 20)

    Returns:
        JSON list of matching emails.
    """
    client_type = EMAIL_CONFIG["client_type"]

    if client_type == "thunderbird":
        profile = find_thunderbird_profile()
        if not profile:
            return json.dumps({"error": "Thunderbird profile not found"})

        if folder and os.path.exists(folder):
            results = search_mbox_emails(folder, query, limit)
            return json.dumps({"results": results, "query": query})
        else:
            # Search all mailboxes
            all_results = []
            mailboxes = get_thunderbird_mailboxes(profile)
            for mbox_info in mailboxes:
                if len(all_results) >= limit:
                    break
                remaining = limit - len(all_results)
                results = search_mbox_emails(mbox_info["path"], query, remaining)
                for r in results:
                    r["folder"] = mbox_info["name"]
                all_results.extend(results)

            return json.dumps({"results": all_results[:limit], "query": query})

    elif client_type == "imap":
        try:
            imap = imaplib.IMAP4_SSL(EMAIL_CONFIG["imap_server"], EMAIL_CONFIG["imap_port"])
            imap.login(EMAIL_CONFIG["email_address"], EMAIL_CONFIG["email_password"])
            imap.select(folder or "INBOX")

            # IMAP search
            status, messages = imap.search(None, f'(OR SUBJECT "{query}" FROM "{query}")')
            email_ids = messages[0].split()[:limit]

            results = []
            for eid in email_ids:
                status, msg_data = imap.fetch(eid, "(RFC822)")
                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)

                results.append({
                    "subject": decode_mime_header(msg.get("Subject", "")),
                    "from": decode_mime_header(msg.get("From", "")),
                    "date": msg.get("Date", ""),
                })

            imap.logout()
            return json.dumps({"results": results, "query": query})
        except Exception as e:
            return json.dumps({"error": str(e)})

    return json.dumps({"error": f"Unsupported client type: {client_type}"})


@mcp.tool()
async def send_email(to: str, subject: str, body: str, cc: Optional[str] = None) -> str:
    """
    Send an email via SMTP.

    Args:
        to: Recipient email address
        subject: Email subject
        body: Email body (plain text)
        cc: Optional CC recipients (comma-separated)

    Returns:
        Status of the send operation.
    """
    if not EMAIL_CONFIG["smtp_server"] or not EMAIL_CONFIG["email_address"]:
        return json.dumps({"error": "SMTP not configured. Set SMTP_SERVER and EMAIL_ADDRESS."})

    try:
        msg = MIMEMultipart()
        msg["From"] = EMAIL_CONFIG["email_address"]
        msg["To"] = to
        msg["Subject"] = subject
        if cc:
            msg["Cc"] = cc

        msg.attach(MIMEText(body, "plain"))

        recipients = [to]
        if cc:
            recipients.extend([addr.strip() for addr in cc.split(",")])

        with smtplib.SMTP(EMAIL_CONFIG["smtp_server"], EMAIL_CONFIG["smtp_port"]) as server:
            server.starttls()
            server.login(EMAIL_CONFIG["email_address"], EMAIL_CONFIG["email_password"])
            server.sendmail(EMAIL_CONFIG["email_address"], recipients, msg.as_string())

        return json.dumps({"success": True, "message": f"Email sent to {to}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
async def get_email_config() -> str:
    """
    Get the current email configuration (without password).

    Returns:
        Current email configuration.
    """
    config = {k: v for k, v in EMAIL_CONFIG.items() if k != "email_password"}
    config["password_set"] = bool(EMAIL_CONFIG["email_password"])
    return json.dumps(config)


if __name__ == "__main__":
    print("Starting Email MCP Server...")
    print(f"Client type: {EMAIL_CONFIG['client_type']}")

    if EMAIL_CONFIG["client_type"] == "thunderbird":
        profile = find_thunderbird_profile()
        if profile:
            print(f"Thunderbird profile: {profile}")
        else:
            print("Warning: Thunderbird profile not found")

    mcp.run(transport="stdio")
