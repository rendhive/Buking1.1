export interface OdooFile {
  path: string;
  name: string;
  category: string;
  content: string;
  language: "python" | "xml" | "csv" | "javascript" | "css" | "html" | "po";
  description: string;
}

export const odooCodebase: OdooFile[] = [
  {
    path: "campus_asset_booking/__init__.py",
    name: "__init__.py",
    category: "Root",
    language: "python",
    description: "Root initialization file for loading module sub-packages.",
    content: `# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from . import models
from . import wizard
from . import controllers
`
  },
  {
    path: "campus_asset_booking/__manifest__.py",
    name: "__manifest__.py",
    category: "Root",
    language: "python",
    description: "Module manifest containing metadata, dependencies, and file load order.",
    content: `# -*- coding: utf-8 -*-
{
    'name': 'Centralized Campus Asset Booking',
    'version': '17.0.1.0.0',
    'summary': 'Sistem Administrasi dan Reservasi Peminjaman Aset Kampus Terpusat',
    'description': """
Sistem Peminjaman Aset Kampus Terpusat (Odoo 17)
==================================================
Modul untuk mengelola peminjaman aset kampus seperti:
- Ruangan (Gedung, Lab, Ruang Rapat)
- Alat Elektronik (Proyektor, Laptop, Sound System)
- Kendaraan Dinas / Operasional Kampus

Fitur Utama:
------------
* Manajemen Master Data Aset Terkategori.
* Validasi Konflik Jadwal (Overlapping) secara Realtime.
* Alur Persetujuan (Workflow Approval) Bertingkat (Draft, Waiting Approval, Approved, Rejected).
* Wizard Konfirmasi Peminjaman & Overriding Admin.
* Cron Job untuk Auto-Release Aset yang melewati batas waktu.
* Integrasi Kontroller API HTTP untuk pemeriksaan status booking eksternal.
* Laporan PDF (Cetak Bukti Peminjaman).
* Widget OWL Dashboard sederhana untuk monitoring reservasi.
    """,
    'author': 'Odoo 17 Campus Project Team',
    'website': 'https://campus-booking.example.com',
    'category': 'Services/Campus',
    'depends': ['base', 'mail', 'web'],
    'data': [
        'security/ir.model.access.csv',
        'data/ir_sequence_data.xml',
        'data/ir_cron_data.xml',
        'views/asset_views.xml',
        'views/booking_views.xml',
        'views/menus.xml',
        'wizard/booking_wizard_view.xml',
        'report/report.xml',
        'report/booking_report_templates.xml',
    ],
    'demo': [
        'demo/booking_demo.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'campus_asset_booking/static/css/custom.css',
            'campus_asset_booking/static/src/js/booking_widget.js',
            'campus_asset_booking/static/src/xml/booking_dashboard_template.xml',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
`
  },
  {
    path: "campus_asset_booking/security/ir.model.access.csv",
    name: "ir.model.access.csv",
    category: "Security",
    language: "csv",
    description: "Model Access Rights (ACL) for normal users and asset managers.",
    content: `id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_campus_asset_user,campus.asset.user,model_campus_asset,base.group_user,1,0,0,0
access_campus_asset_manager,campus.asset.manager,model_campus_asset,base.group_system,1,1,1,1
access_campus_booking_user,campus.booking.user,model_campus_booking,base.group_user,1,1,1,0
access_campus_booking_manager,campus.booking.manager,model_campus_booking,base.group_system,1,1,1,1
access_booking_confirm_wizard,booking.confirm.wizard,model_booking_confirm_wizard,base.group_user,1,1,1,1
`
  },
  {
    path: "campus_asset_booking/models/__init__.py",
    name: "__init__.py",
    category: "Models",
    language: "python",
    description: "Initialization file loader for models package.",
    content: `# -*- coding: utf-8 -*-

from . import asset
from . import booking
`
  },
  {
    path: "campus_asset_booking/models/asset.py",
    name: "asset.py",
    category: "Models",
    language: "python",
    description: "Definition of campus asset master data model.",
    content: `# -*- coding: utf-8 -*-
from odoo import models, fields, api, _

class CampusAsset(models.Model):
    _name = 'campus.asset'
    _description = 'Campus Asset Master Data'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name ascending'

    name = fields.Char(string='Asset Name', required=True, tracking=True)
    code = fields.Char(string='Asset Code', required=True, copy=False, index=True, default=lambda self: _('New'))
    category = fields.Selection([
        ('building', 'Building / Room'),
        ('equipment', 'Electronic Equipment'),
        ('vehicle', 'Campus Vehicle'),
    ], string='Asset Category', required=True, default='building', tracking=True)
    location = fields.Char(string='Location / Storage Room', required=True, tracking=True)
    capacity = fields.Integer(string='Capacity (People)', default=1, help="Only relevant for rooms or vehicles")
    status = fields.Selection([
        ('available', 'Available'),
        ('booked', 'Occupied / Active'),
        ('maintenance', 'Under Maintenance'),
    ], string='Resource Status', default='available', required=True, tracking=True)
    description = fields.Text(string='Technical Description & Policies')
    responsible_id = fields.Many2one('res.users', string='Person In Charge (PIC)', default=lambda self: self.env.user, required=True)
    booking_ids = fields.One2many('campus.booking', 'asset_id', string='Booking History')
    active = fields.Boolean(default=True, string='Archived')

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('code', _('New')) == _('New'):
                vals['code'] = self.env['ir.sequence'].next_by_code('campus.asset.sequence') or '/'
        return super(CampusAsset, self).create(vals_list)

    def action_set_maintenance(self):
        for record in self:
            record.status = 'maintenance'
            record.message_post(body=_("Asset status updated to Maintenance by User."))

    def action_set_available(self):
        for record in self:
            record.status = 'available'
            record.message_post(body=_("Asset status reverted to Available."))
`
  },
  {
    path: "campus_asset_booking/models/booking.py",
    name: "booking.py",
    category: "Models",
    language: "python",
    description: "Database definition and reservation validation logic.",
    content: `# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
from datetime import datetime

class CampusBooking(models.Model):
    _name = 'campus.booking'
    _description = 'Campus Asset Booking Record'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'date_start desc'

    name = fields.Char(string='Reservation Ref', required=True, copy=False, readonly=True, index=True, default=lambda self: _('New'))
    asset_id = fields.Many2one('campus.asset', string='Target Asset', required=True, tracking=True, domain=[('active', '=', True)])
    asset_category = fields.Selection(related='asset_id.category', string='Asset Category', store=True)
    user_id = fields.Many2one('res.users', string='Borrower / Applicant', default=lambda self: self.env.user, required=True, tracking=True)
    contact_phone = fields.Char(string='WhatsApp Number', required=True)
    purpose = fields.Text(string='Purpose / Academic Activity', required=True)
    date_start = fields.Datetime(string='Start Time', required=True, tracking=True, default=fields.Datetime.now)
    date_end = fields.Datetime(string='End Time', required=True, tracking=True)
    state = fields.Selection([
        ('draft', 'Draft Request'),
        ('waiting', 'Waiting Approval'),
        ('approved', 'Approved & Reserved'),
        ('rejected', 'Request Denied'),
        ('expired', 'Expired / Unreleased'),
    ], string='Booking Status', default='draft', required=True, tracking=True)
    approval_notes = fields.Text(string='PIC / Approver Notes', tracking=True)
    approved_by_id = fields.Many2one('res.users', string='Approver PIC', readonly=True)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('New')) == _('New'):
                vals['name'] = self.env['ir.sequence'].next_by_code('campus.booking.sequence') or '/'
        return super(CampusBooking, self).create(vals_list)

    @api.constrains('date_start', 'date_end', 'asset_id')
    def _check_booking_durations(self):
        for record in self:
            if record.date_start and record.date_end:
                if record.date_start >= record.date_end:
                    raise ValidationError(_("Error! Waktu Mulai Peminjaman tidak boleh melampaui Waktu Selesai."))
                
                # Check overlapping active bookings
                overlapping = self.env['campus.booking'].search([
                    ('id', '!=', record.id),
                    ('asset_id', '=', record.asset_id.id),
                    ('state', '=', 'approved'),
                    ('date_start', '<', record.date_end),
                    ('date_end', '>', record.date_start)
                ])
                if overlapping:
                    times = [f"{b.name} ({b.date_start} s/d {b.date_end})" for b in overlapping]
                    raise ValidationError(_("Konflik Jadwal Deteksi! Aset '%s' sedang dipesan aktif pada periode tsb oleh: %s") % (record.asset_id.name, ", ".join(times)))

    def action_submit_request(self):
        self.ensure_one()
        if self.asset_id.status == 'maintenance':
            raise ValidationError(_("Aset sedang berada dalam pemeliharaan (Maintenance) dan tidak bisa di-booking saat ini."))
        self.write({'state': 'waiting'})
        self.message_post(body=_("Booking request submitted to Asset PIC. Awaiting assessment."))

    def action_approve(self):
        self.ensure_one()
        self.write({
            'state': 'approved',
            'approved_by_id': self.env.user.id,
            'approval_notes': self.approval_notes or 'Secured approval. Asset locked successfully.'
        })
        self.asset_id.status = 'booked'
        self.message_post(body=_("Booking approved successfully. Status set to Approved & Reserved."))

    def action_reject(self):
        self.ensure_one()
        self.write({
            'state': 'rejected',
            'approved_by_id': self.env.user.id,
        })
        self.asset_id.status = 'available'
        self.message_post(body=_("Booking request denied by Administrator."))

    def action_set_draft(self):
        self.ensure_one()
        self.write({'state': 'draft'})

    @api.model
    def cron_release_expired_bookings(self):
        """Called automatically by Cron Job to clean expired bookings."""
        now = datetime.now()
        expired_bookings = self.search([
            ('state', '=', 'approved'),
            ('date_end', '<', now)
        ])
        for b in expired_bookings:
            b.write({'state': 'expired'})
            b.asset_id.status = 'available'
            b.message_post(body=_("Automated Cron Auto-Release: Booking has completed its scheduled duration. Asset available again."))
`
  },
  {
    path: "campus_asset_booking/wizard/__init__.py",
    name: "__init__.py",
    category: "Wizard",
    language: "python",
    description: "Wizard imports initialization.",
    content: `# -*- coding: utf-8 -*-

from . import booking_wizard
`
  },
  {
    path: "campus_asset_booking/wizard/booking_wizard.py",
    name: "booking_wizard.py",
    category: "Wizard",
    language: "python",
    description: "Transient model for active confirm booking popup workflow action.",
    content: `# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from odoo.exceptions import UserError

class BookingConfirmWizard(models.TransientModel):
    _name = 'booking.confirm.wizard'
    _description = 'Interactive Safety Check Confirm Booking Wizard'

    booking_id = fields.Many2one('campus.booking', string='Target Booking', required=True)
    override_conflict = fields.Boolean(string='Urgent Academic Overriding', default=False)
    terms_accepted = fields.Boolean(string='Understand Liability Terms', required=True, default=False)
    purity_level = fields.Selection([
        ('normal', 'Standard Priority (Subject to cancellation)'),
        ('high', 'High Priority Event (Protected Booking)'),
    ], string='Priority Level', default='normal', required=True)
    custom_instructions = fields.Text(string='Special Logistics Request')

    @api.model
    def default_get(self, fields_list):
        res = super(BookingConfirmWizard, self).default_get(fields_list)
        active_id = self.env.context.get('active_id')
        if active_id:
            res['booking_id'] = active_id
        return res

    def action_confirm_with_terms(self):
        self.ensure_one()
        if not self.terms_accepted:
            raise UserError(_("Anda wajib menyetujui seluruh syarat & ketentuan penggunaan aset kampus untuk melanjutkan."))
        
        booking = self.booking_id
        if booking.asset_id.status == 'maintenance' and not self.override_conflict:
            raise UserError(_("Aset dalam pemeliharaan! Periksa opsi override jika Anda merupakan Admin dengan hak darurat."))

        # Update logs on booking
        priority_desc = "High Priority Event (VIP Protection)" if self.purity_level == 'high' else "Standard Booking"
        booking_notes = _("Syarat disetujui secara digital. Level Prioritas: %s.\\nCatatan Logistik: %s") % (priority_desc, self.custom_instructions or "-")
        
        booking.write({
            'approval_notes': booking_notes,
        })
        booking.action_submit_request()
        return {'type': 'ir.actions.act_window_close'}
`
  },
  {
    path: "campus_asset_booking/wizard/booking_wizard_view.xml",
    name: "booking_wizard_view.xml",
    category: "Wizard",
    language: "xml",
    description: "Form layout defining popup modal visual parameters.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <record id="view_booking_confirm_wizard_form" model="ir.ui.view">
        <name>booking.confirm.wizard.form</name>
        <model>booking.confirm.wizard</model>
        <arch type="xml">
            <form string="Konfirmasi Syarat &amp; Ketentuan Penggunaan Aset">
                <group>
                    <field name="booking_id" readonly="1" options="{'no_open': True}"/>
                    <field name="purity_level" widget="radio"/>
                </group>
                <group string="Pernyataan Tanggung Jawab">
                    <p class="text-muted text-wrap">
                        Dengan menekan tombol konfirmasi di bawah, Peminjam bertanggung jawab secara penuh
                        atas kebersihan, keamanan, dan fungsionalitas seluruh perangkat atau ruangan yang dipinjam.
                        Kerusakan aset akibat kelalaian wajib diganti sesuai nilai depresiasi yang telah diputuskan Kampus.
                    </p>
                    <field name="terms_accepted" string="Saya setuju dan siap bertanggung jawab penuh atas aset"/>
                    <field name="override_conflict" string="Gunakan Hak Akses Prioritas PIC (Override Maintenance)"/>
                </group>
                <group string="Logistik Opsional">
                    <field name="custom_instructions" placeholder="Instruksi logistik khusus (contoh: Butuh mic nirkabel tambahan, AC dinyalakan 15 menit sebelum acara, dll)"/>
                </group>
                <footer>
                    <button string="Kirim Permohonan" name="action_confirm_with_terms" type="object" class="btn-primary"/>
                    <button string="Batal" class="btn-secondary" special="cancel"/>
                </footer>
            </form>
        </arch>
    </record>

    <record id="action_booking_confirm_wizard" model="ir.actions.act_window">
        <name>Confirm Terms &amp; Conditions</name>
        <res_model>booking.confirm.wizard</res_model>
        <view_mode>form</view_mode>
        <target>new</target>
    </record>
</odoo>
`
  },
  {
    path: "campus_asset_booking/views/asset_views.xml",
    name: "asset_views.xml",
    category: "Views",
    language: "xml",
    description: "Tree, Form, and Search XML layouts for asset master list.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <!-- Asset Tree/List View -->
    <record id="view_campus_asset_tree" model="ir.ui.view">
        <name>campus.asset.tree</name>
        <model>campus.asset</model>
        <arch type="xml">
            <tree decoration-info="status == 'available'" decoration-warning="status == 'booked'" decoration-danger="status == 'maintenance'">
                <field name="code"/>
                <field name="name"/>
                <field name="category"/>
                <field name="location"/>
                <field name="capacity"/>
                <field name="responsible_id"/>
                <field name="status" widget="badge" decoration-success="status == 'available'" decoration-warning="status == 'booked'" decoration-danger="status == 'maintenance'"/>
            </tree>
        </arch>
    </record>

    <!-- Asset Form View -->
    <record id="view_campus_asset_form" model="ir.ui.view">
        <name>campus.asset.form</name>
        <model>campus.asset</model>
        <arch type="xml">
            <form string="Campus Asset Form">
                <header>
                    <button name="action_set_maintenance" type="object" string="Put in Maintenance" class="btn-danger" invisible="status == 'maintenance'"/>
                    <button name="action_set_available" type="object" string="Set to Available" class="btn-success" invisible="status == 'available'"/>
                    <field name="status" widget="statusbar" statusbar_visible="available,booked,maintenance"/>
                </header>
                <sheet>
                    <div class="oe_title">
                        <label for="name" class="oe_edit_only"/>
                        <h1>
                            <field name="name" placeholder="Contoh: Gedung Serbaguna Lt. 1"/>
                        </h1>
                    </div>
                    <group>
                        <group>
                            <field name="code" readonly="1"/>
                            <field name="category"/>
                            <field name="location"/>
                        </group>
                        <group>
                            <field name="capacity"/>
                            <field name="responsible_id" options="{'no_create': True}"/>
                            <field name="active" widget="boolean_button"/>
                        </group>
                    </group>
                    <notebook>
                        <page string="Detail Kebijakan &amp; Spek" name="policies">
                            <field name="description" placeholder="Instruksi kelayakan, spesifikasi teknis, atau batasan jam pinjam..."/>
                        </page>
                        <page string="Riwayat Booking" name="booking_history">
                            <field name="booking_ids" readonly="1">
                                <tree>
                                    <field name="name"/>
                                    <field name="user_id"/>
                                    <field name="date_start"/>
                                    <field name="date_end"/>
                                    <field name="state" widget="badge"/>
                                </tree>
                            </field>
                        </page>
                    </notebook>
                </sheet>
                <div class="oe_chatter">
                    <field name="message_follower_ids" widget="mail_followers"/>
                    <field name="activity_ids" widget="mail_activity"/>
                    <field name="message_ids" widget="mail_thread"/>
                </div>
            </form>
        </arch>
    </record>

    <!-- Search View -->
    <record id="view_campus_asset_search" model="ir.ui.view">
        <name>campus.asset.search</name>
        <model>campus.asset</model>
        <arch type="xml">
            <search string="Search Campus Assets">
                <field name="name" string="Nama Aset"/>
                <field name="code" string="Kode Aset"/>
                <filter string="Tersedia (Available)" name="available" domain="[('status', '=', 'available')]"/>
                <filter string="Perawatan (Maintenance)" name="maintenance" domain="[('status', '=', 'maintenance')]"/>
                <group expand="0" string="Group By">
                    <filter string="Kategori" name="category" context="{'group_by': 'category'}"/>
                    <filter string="Status" name="status" context="{'group_by': 'status'}"/>
                </group>
            </search>
        </arch>
    </record>

    <!-- Action Action Win -->
    <record id="action_campus_asset" model="ir.actions.act_window">
        <name>Campus Assets Master</name>
        <res_model>campus.asset</res_model>
        <view_mode>tree,form</view_mode>
        <search_view_id ref="view_campus_asset_search"/>
        <help type="html">
          <p class="o_view_nocontent_smiling_face">
            Tambahkan atau kelola aset kampus terpusat Anda di sini!
          </p>
        </help>
    </record>
</odoo>
`
  },
  {
    path: "campus_asset_booking/views/booking_views.xml",
    name: "booking_views.xml",
    category: "Views",
    language: "xml",
    description: "Calendar, Tree, and custom Form configuration with workflow nodes.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <!-- Booking Tree List View -->
    <record id="view_campus_booking_tree" model="ir.ui.view">
        <name>campus.booking.tree</name>
        <model>campus.booking</model>
        <arch type="xml">
            <tree decoration-muted="state == 'expired'" decoration-warning="state == 'waiting'" decoration-success="state == 'approved'" decoration-danger="state == 'rejected'">
                <field name="name"/>
                <field name="asset_id" widget="many2one_avatar"/>
                <field name="asset_category"/>
                <field name="user_id"/>
                <field name="contact_phone"/>
                <field name="date_start"/>
                <field name="date_end"/>
                <field name="state" widget="badge" decoration-info="state == 'draft'" decoration-warning="state == 'waiting'" decoration-success="state == 'approved'" decoration-danger="state == 'rejected'" decoration-muted="state == 'expired'"/>
            </tree>
        </arch>
    </record>

    <!-- Booking Form View -->
    <record id="view_campus_booking_form" model="ir.ui.view">
        <name>campus.booking.form</name>
        <model>campus.booking</model>
        <arch type="xml">
            <form string="Campus Booking Form">
                <header>
                    <button name="%(action_booking_confirm_wizard)d" type="action" string="Submit Request" class="btn-primary" invisible="state != 'draft'"/>
                    <button name="action_approve" type="object" string="Approve Booking" class="btn-success" invisible="state != 'waiting'"/>
                    <button name="action_reject" type="object" string="Deny Booking" class="btn-danger" invisible="state != 'waiting'"/>
                    <button name="action_set_draft" type="object" string="Reset to Draft" class="btn-secondary" invisible="state not in ['rejected', 'expired']"/>
                    <field name="state" widget="statusbar" statusbar_visible="draft,waiting,approved,rejected"/>
                </header>
                <sheet>
                    <div class="oe_title">
                        <label for="name" class="oe_edit_only"/>
                        <h1>
                            <field name="name" readonly="1"/>
                        </h1>
                    </div>
                    <group>
                        <group string="Atribut Aset">
                            <field name="asset_id" options="{'no_create': True}"/>
                            <field name="asset_category" readonly="1"/>
                        </group>
                        <group string="Detail Pengajuan">
                            <field name="user_id" options="{'no_create': True}"/>
                            <field name="contact_phone" placeholder="Contoh: 081234567890"/>
                        </group>
                    </group>
                    <group string="Periode &amp; Durasi Booking">
                        <group>
                            <field name="date_start" required="1"/>
                        </group>
                        <group>
                            <field name="date_end" required="1"/>
                        </group>
                    </group>
                    <group string="Deskripsi &amp; Review">
                        <field name="purpose" placeholder="Gunakan peminjaman aset ini untuk mendukung agenda kegiatan apa... (Rinci &amp; Jelas)"/>
                        <field name="approval_notes" placeholder="Catatan persetujuan PIC atau feedback penolakan..."/>
                        <field name="approved_by_id" readonly="1"/>
                    </group>
                </sheet>
                <div class="oe_chatter">
                    <field name="message_follower_ids" widget="mail_followers"/>
                    <field name="activity_ids" widget="mail_activity"/>
                    <field name="message_ids" widget="mail_thread"/>
                </div>
            </form>
        </arch>
    </record>

    <!-- Calendar View for Bookings Schedule Dashboard -->
    <record id="view_campus_booking_calendar" model="ir.ui.view">
        <name>campus.booking.calendar</name>
        <model>campus.booking</model>
        <arch type="xml">
            <calendar string="Jadwal Reservasi Aset" date_start="date_start" date_stop="date_end" color="asset_id" quick_create="false">
                <field name="name"/>
                <field name="asset_id"/>
                <field name="user_id"/>
                <field name="state"/>
            </calendar>
        </arch>
    </record>

    <!-- Search / Filter Booking -->
    <record id="view_campus_booking_search" model="ir.ui.view">
        <name>campus.booking.search</name>
        <model>campus.booking</model>
        <arch type="xml">
            <search string="Search Bookings">
                <field name="name"/>
                <field name="asset_id"/>
                <field name="user_id"/>
                <filter string="Butuh Persetujuan" name="waiting" domain="[('state', '=', 'waiting')]"/>
                <filter string="Aktif &amp; Disetujui" name="approved" domain="[('state', '=', 'approved')]"/>
                <group expand="0" string="Group By">
                    <filter string="Aset" name="asset_id" context="{'group_by': 'asset_id'}"/>
                    <filter string="Status Peminjaman" name="state" context="{'group_by': 'state'}"/>
                </group>
            </search>
        </arch>
    </record>

    <!-- Action Booking -->
    <record id="action_campus_booking" model="ir.actions.act_window">
        <name>Asset Bookings Log</name>
        <res_model>campus.booking</res_model>
        <view_mode>tree,form,calendar</view_mode>
        <search_view_id ref="view_campus_booking_search"/>
    </record>
</odoo>
`
  },
  {
    path: "campus_asset_booking/views/menus.xml",
    name: "menus.xml",
    category: "Views",
    language: "xml",
    description: "Global hierarchical Odoo 17 menu declaration xml file.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <!-- Top-Level Root Menu -->
    <menuitem id="menu_campus_booking_root"
              name="Booking Aset"
              web_icon="campus_asset_booking,static/description/icon.png"
              sequence="10"/>

    <!-- Sidebar Submenu: Reservasi -->
    <menuitem id="menu_campus_booking_sub"
              name="All Reservations"
              parent="menu_campus_booking_root"
              sequence="10"/>

    <menuitem id="menu_campus_booking_items"
              name="Booking Records"
              parent="menu_campus_booking_sub"
              action="action_campus_booking"
              sequence="10"/>

    <!-- Sidebar Submenu: Keasetan -->
    <menuitem id="menu_campus_asset_sub"
              name="Asset Management"
              parent="menu_campus_booking_root"
              sequence="20"/>

    <menuitem id="menu_campus_booking_assets"
              name="Campus Resources"
              parent="menu_campus_asset_sub"
              action="action_campus_asset"
              sequence="10"/>
</odoo>
`
  },
  {
    path: "campus_asset_booking/data/ir_sequence_data.xml",
    name: "ir_sequence_data.xml",
    category: "Data",
    language: "xml",
    description: "Automatic generation rules for auto-incremental sequences.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <data noupdate="1">
        <!-- Sequence for Campus Asset -->
        <record id="seq_campus_asset" model="ir.sequence">
            <name>Campus Asset Code Sequence</name>
            <code>campus.asset.sequence</code>
            <prefix>AST/</prefix>
            <padding>4</padding>
            <number_next>1</number_next>
            <number_increment>1</number_increment>
            <company_id eval="False"/>
        </record>

        <!-- Sequence for Campus Booking -->
        <record id="seq_campus_booking" model="ir.sequence">
            <name>Campus Asset Booking Sequence</name>
            <code>campus.booking.sequence</code>
            <prefix>BKS/%(year)s/</prefix>
            <padding>5</padding>
            <number_next>1</number_next>
            <number_increment>1</number_increment>
            <company_id eval="False"/>
        </record>
    </data>
</odoo>
`
  },
  {
    path: "campus_asset_booking/data/ir_cron_data.xml",
    name: "ir_cron_data.xml",
    category: "Data",
    language: "xml",
    description: "Automated cron jobs for auto-release of expired asset reservations.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <data noupdate="1">
        <record id="cron_auto_release_expired_bookings" model="ir.cron">
            <name>Campus Asset Booking: Auto-Release Expired Reservations</name>
            <model_id ref="model_campus_booking"/>
            <state>code</state>
            <code>model.cron_release_expired_bookings()</code>
            <interval_number>15</interval_number>
            <interval_type>minutes</interval_type>
            <numbercall>-1</numbercall>
            <active>True</active>
            <doall eval="False"/>
        </record>
    </data>
</odoo>
`
  },
  {
    path: "campus_asset_booking/demo/booking_demo.xml",
    name: "booking_demo.xml",
    category: "Demo",
    language: "xml",
    description: "Dummy database entries for instantly seed-testing layouts.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <!-- Seed master campus assets -->
    <record id="asset_demo_hall" model="campus.asset">
        <name>Gedung Auditorium Prof. Ir. Sudarto</name>
        <category>building</category>
        <location>Kampus Tembalang, Sektor Utara</location>
        <capacity>1200</capacity>
        <status>available</status>
        <description>Gedung pertemuan kapasitas besar dengan sound system 10.000 Watt, AC sentral, ideal untuk sarasehan atau wisuda.</description>
    </record>

    <record id="asset_demo_lab" model="campus.asset">
        <name>Laboratorium Desain &amp; CAD S1 Informatika</name>
        <category>building</category>
        <location>Gedung E Lantai 3, Fakultas Teknik</location>
        <capacity>45</capacity>
        <status>available</status>
        <description>Fasilitas lab komputer ber-spec GPU tinggi RTX 4070, cocok untuk riset grafika komputasi atau workshop.</description>
    </record>

    <record id="asset_demo_laptop" model="campus.asset">
        <name>Laptop Asus ROG Strix - Asset PIC</name>
        <category>equipment</category>
        <location>Gudang Server PTIK Central</location>
        <capacity>1</capacity>
        <status>available</status>
        <description>Laptop operasional pinjam-pakaikan untuk kebutuhan turnamen esports mahasiswa atau pengolahan data AI.</description>
    </record>

    <record id="asset_demo_bus" model="campus.asset">
        <name>Microbus Toyota HiAce Operasional Kampus</name>
        <category>vehicle</category>
        <location>Garasi Gedung Rektorat Sayap Kiri</location>
        <capacity>15</capacity>
        <status>available</status>
        <description>Minibus kampus dengan sopir untuk pengantaran rombongan dosen menteri, tim PKM, atau delegasi konferensi luar kota.</description>
    </record>

    <!-- Seed sample draft booking -->
    <record id="booking_demo_1" model="campus.booking">
        <field name="asset_id" ref="asset_demo_lab"/>
        <field name="contact_phone">08581234900</field>
        <field name="purpose">Workshop Pengembangan Model Klasifikasi Deteksi Kanker Paru dengan Machine Learning</field>
        <field name="date_start" eval="(datetime.now() + relativedelta(days=1, hours=2)).strftime('%Y-%m-%d %H:%M:%S')"/>
        <field name="date_end" eval="(datetime.now() + relativedelta(days=1, hours=6)).strftime('%Y-%m-%d %H:%M:%S')"/>
        <field name="state">draft</field>
    </record>

    <!-- Seed sample active approved booking -->
    <record id="booking_demo_2" model="campus.booking">
        <field name="asset_id" ref="asset_demo_bus"/>
        <field name="contact_phone">08215555432</field>
        <field name="purpose">Transportasi Pengantaran Tim KKN Reguler Universitas ke Wilayah Temanggung Selatan</field>
        <field name="date_start" eval="(datetime.now() + relativedelta(days=5)).strftime('%Y-%m-%d 07:00:00')"/>
        <field name="date_end" eval="(datetime.now() + relativedelta(days=5)).strftime('%Y-%m-%d 18:00:00')"/>
        <field name="state">approved</field>
        <field name="approval_notes">Izin dikonfirmasi langsung oleh Kepala Humas Akademik. Supir yang didelegasikan: Pak Bambang.</field>
    </record>
</odoo>
`
  },
  {
    path: "campus_asset_booking/controllers/__init__.py",
    name: "__init__.py",
    category: "Controllers",
    language: "python",
    description: "Initial loaders for REST-API router controller module.",
    content: `# -*- coding: utf-8 -*-

from . import main
`
  },
  {
    path: "campus_asset_booking/controllers/main.py",
    name: "main.py",
    category: "Controllers",
    language: "python",
    description: "Routing endpoints for external checking or JSON payload endpoints.",
    content: `# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request, Response
import json

class CampusAssetBookingController(http.Controller):

    @http.route('/api/campus/asset/list', type='json', auth='public', methods=['POST'], csrf=False)
    def get_public_assets(self, **kwargs):
        """Returns JSON list of active campus assets and their current availability state."""
        assets = request.env['campus.asset'].sudo().search([('active', '=', True)])
        asset_data = []
        for asset in assets:
            asset_data.append({
                'id': asset.id,
                'name': asset.name,
                'code': asset.code,
                'category': asset.category,
                'location': asset.location,
                'capacity': asset.capacity,
                'status': asset.status,
                'responsible': asset.responsible_id.name
            })
        return {
            'status': 'success',
            'data': asset_data,
            'total_count': len(asset_data)
        }

    @http.route('/api/campus/booking/check_status', type='http', auth='public', methods=['GET'], csrf=False)
    def check_booking_status_direct(self, reference=None, **kwargs):
        """Public verification endpoint returning status of a single booking reference."""
        if not reference:
            return Response(
                json.dumps({'status': 'error', 'message': 'Missing parameter [reference]'}),
                status=400, content_type='application/json'
            )
        
        booking = request.env['campus.booking'].sudo().search([('name', '=', reference)], limit=1)
        if not booking:
            return Response(
                json.dumps({'status': 'error', 'message': f'Booking Reference [{reference}] not found.'}),
                status=404, content_type='application/json'
            )

        data = {
            'reference': booking.name,
            'asset_name': booking.asset_id.name,
            'borrower': booking.user_id.name,
            'purpose': booking.purpose,
            'time_span': f"{booking.date_start} s/d {booking.date_end}",
            'state': booking.state,
            'approver_feedback': booking.approval_notes or '-'
        }
        return Response(json.dumps({'status': 'success', 'data': data}), status=200, content_type='application/json')
`
  },
  {
    path: "campus_asset_booking/report/report.xml",
    name: "report.xml",
    category: "Report",
    language: "xml",
    description: "Action node registration mapping print layouts template engines to backend.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <record id="action_report_campus_booking" model="ir.actions.report">
        <name>Cetak Bukti Peminjaman</name>
        <model>campus.booking</model>
        <report_type>qweb-pdf</report_type>
        <report_name>campus_asset_booking.report_booking_card_template</report_name>
        <report_file>campus_asset_booking.report_booking_card_template</report_file>
        <binding_model_id ref="model_campus_booking"/>
        <binding_type>report</binding_type>
    </record>
</odoo>
`
  },
  {
    path: "campus_asset_booking/report/booking_report_templates.xml",
    name: "booking_report_templates.xml",
    category: "Report",
    language: "xml",
    description: "PDF card template in HTML + Bootstrap layout formats for print rendering.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <template id="report_booking_card_template">
        <t t-call="web.html_container">
            <t t-foreach="docs" t-as="doc">
                <t t-call="web.external_layout">
                    <div class="page" style="font-family: 'Helvetica', sans-serif; color: #2C3E50;">
                        <!-- Report Header -->
                        <div class="text-center" style="border-bottom: 2px solid #714B67; padding-bottom: 15px; margin-bottom: 30px;">
                            <h2 style="color: #714B67; font-weight: bold; text-transform: uppercase; margin: 0;">Bukti Resmi Peminjaman Aset Kampus</h2>
                            <p style="font-style: italic; font-size: 11px; margin: 5px 0 0 0;">Nomor Referensi Legal: <span class="fw-bold" t-field="doc.name"/></p>
                        </div>

                        <!-- Main Table layout -->
                        <div class="row">
                            <div class="col-6">
                                <h4 style="border-bottom: 1px solid #714B67; padding-bottom: 5px; margin-bottom: 15px;">Informasi Peminjam</h4>
                                <table class="table table-borderless table-sm">
                                    <tr>
                                        <td style="width: 35%; font-weight: bold;">Nama Peminjam</td>
                                        <td>: <span t-field="doc.user_id.name"/></td>
                                    </tr>
                                    <tr>
                                        <td style="font-weight: bold;">WhatsApp / HP</td>
                                        <td>: <span t-field="doc.contact_phone"/></td>
                                    </tr>
                                    <tr>
                                        <td style="font-weight: bold;">Departemen/Unit</td>
                                        <td>: Akademik / Mahasiswa Terdaftar</td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-6">
                                <h4 style="border-bottom: 1px solid #714B67; padding-bottom: 5px; margin-bottom: 15px;">Informasi Aset</h4>
                                <table class="table table-borderless table-sm">
                                    <tr>
                                        <td style="width: 35%; font-weight: bold;">Aset Sasaran</td>
                                        <td>: <span t-field="doc.asset_id.name"/></td>
                                    </tr>
                                    <tr>
                                        <td style="font-weight: bold;">Kategori Aset</td>
                                        <td>: <span t-field="doc.asset_category"/></td>
                                    </tr>
                                    <tr>
                                        <td style="font-weight: bold;">Lokasi Fisik</td>
                                        <td>: <span t-field="doc.asset_id.location"/></td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <!-- Date parameters block -->
                        <div style="background-color: #F8F9FA; padding: 15px; border-radius: 5px; border-left: 5px solid #714B67; margin: 25px 0;">
                            <h5 style="margin-top: 0; font-weight: bold; color: #714B67;">Jadwal Persetujuan</h5>
                            <div class="row">
                                <div class="col-6">
                                    <strong>Waktu Mulai:</strong> <span t-field="doc.date_start" t-options='{"widget": "datetime"}'/>
                                </div>
                                <div class="col-6">
                                    <strong>Waktu Selesai:</strong> <span t-field="doc.date_end" t-options='{"widget": "datetime"}'/>
                                </div>
                            </div>
                        </div>

                        <!-- Purpose details -->
                        <div style="margin-bottom: 30px;">
                            <h5 style="font-weight: bold; border-bottom: 1px solid #E9ECEF; padding-bottom: 5px;">Tujuan Penggunaan &amp; Kegiatan</h5>
                            <p style="line-height: 1.6; background-color: #FFF; padding: 10px; border: 1px solid #E9ECEF; border-radius: 4px;" t-field="doc.purpose"/>
                        </div>

                        <!-- Status and feedback notes -->
                        <div class="row" style="margin-top: 50px;">
                            <div class="col-4 text-center">
                                <p style="font-size: 12px; margin-bottom: 50px;">Pemohon/Peminjam</p>
                                <p style="font-weight: bold; margin: 0; border-top: 1px solid #AAA; padding-top: 5px;" t-field="doc.user_id.name"/>
                                <span class="text-muted" style="font-size: 10px;">Ditandatangani Digital</span>
                            </div>
                            <div class="col-4 text-center">
                                <p style="font-size: 12px; margin-bottom: 50px;">Pengelola Aset / PIC</p>
                                <p style="font-weight: bold; margin: 0; border-top: 1px solid #AAA; padding-top: 5px;" t-field="doc.asset_id.responsible_id.name"/>
                                <span class="text-muted" style="font-size: 10px;">Pemberi Izin</span>
                            </div>
                            <div class="col-4 text-center">
                                <p style="font-size: 12px; margin-bottom: 10px;">Status Administrasi</p>
                                <div style="border: 2px solid #714B67; display: inline-block; padding: 8px 15px; font-weight: bold; font-size: 16px; color: #714B67; border-radius: 4px; text-transform: uppercase;">
                                    <span t-field="doc.state"/>
                                </div>
                            </div>
                        </div>

                        <!-- Footer fine-text rules -->
                        <div style="margin-top: 80px; font-size: 9px; color: #7F8C8D; border-top: 1px solid #BDC3C7; padding-top: 10px;">
                            <p class="text-center">
                                Dokumen ini diterbitkan secara sah oleh Unit Tata Usaha Terpusat Kampus.
                                Seluruh rincian terekam secara otomatis di server ERP Odoo v17.
                            </p>
                        </div>
                    </div>
                </t>
            </t>
        </t>
    </template>
</odoo>
`
  },
  {
    path: "campus_asset_booking/static/description/index.html",
    name: "index.html",
    category: "Static Assets",
    language: "html",
    description: "Introductory metadata html documentation indexed by Odoo Apps library.",
    content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sistem Booking Aset Sentralisasi Kampus</title>
</head>
<body style="font-family: 'Montserrat', sans-serif; background-color: #FAFAFA; color: #333; padding: 40px;">
    <div style="max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #EAEAEA;">
        <div style="background-color: #714B67; color: white; padding: 40px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 1px;">Sistem Booking Aset Kampus Terpusat</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Modul Odoo 17 Professional untuk Solusi Smart Campus Terpadu</p>
        </div>
        <div style="padding: 40px;">
            <p style="font-size: 15px; line-height: 1.7; color: #555;">
                <strong>campus_asset_booking</strong> adalah modul komprehensif Odoo v17 Enterprise / Community yang dikembangkan untuk menyederhanakan siklus hidup peminjaman aset institusi sekolah, universitas, atau lembaga pendidikan tinggi Anda. Aset berupa ruangan (laboratorium, auditorium, kelas), hardware (proyektor, laptop), dan kendaraan dinas dijadwalkan secara andal tanpa risiko over-booking.
            </p>
            
            <h3 style="color: #714B67; border-bottom: 2px solid #F1ECEF; padding-bottom: 8px; margin-top: 30px;">Fitur Utama Pengelolaan</h3>
            <ul style="line-height: 2; font-size: 14px; color: #555;">
                <li><strong>Anti Overlap:</strong> Logika validasi Python murni di model mencegah 2 entitas menyewa aset yang sama di jam yang sama.</li>
                <li><strong>Interactive Wizard:</strong> Popup konfirmasi dengan syarat & ketentuan hukum sanksi peminjaman.</li>
                <li><strong>Cron Engine:</strong> Pengembalian status aset ke "Tersedia" jika waktu penggunaan telah selesai dibaca server.</li>
                <li><strong>Printed Authorization:</strong> Cetak salinan resmi PDF tanda terima kelayakan kunci bagi asisten praktikum.</li>
            </ul>

            <h3 style="color: #714B67; border-bottom: 2px solid #F1ECEF; padding-bottom: 8px; margin-top: 30px;">Struktur Folder Output</h3>
            <pre style="background: #F4F4F4; padding: 15px; border-radius: 6px; font-family: Courier, monospace; font-size: 12px; overflow-x: auto;">
campus_asset_booking/
├── data/
│   ├── ir_sequence_data.xml
│   └── ir_cron_data.xml
├── demo/
│   └── booking_demo.xml
├── models/
│   ├── asset.py
│   └── booking.py
├── views/
│   ├── asset_views.xml
│   ├── booking_views.xml
│   └── menus.xml
├── wizard/
│   ├── booking_wizard.py
│   └── booking_wizard_view.xml
├── report/
│   ├── report.xml
│   └── booking_report_templates.xml
└── security/
    └── ir.model.access.csv
            </pre>
        </div>
        <div style="background-color: #F8F9FA; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #EAEAEA;">
            Odoo 17 Solution Developer Team &copy; 2026. All rights secured.
        </div>
    </div>
</body>
</html>
`
  },
  {
    path: "campus_asset_booking/static/src/js/booking_widget.js",
    name: "booking_widget.js",
    category: "Static Assets",
    language: "javascript",
    description: "Owl javascript UI widget skeleton for rendering Odoo v17 customized dashboard logs.",
    content: `/** @odoo-module **/
import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

export class CampusBookingMonitor extends Component {
    static template = "campus_asset_booking.CampusBookingMonitorTemplate";

    setup() {
        this.state = useState({
            liveCounters: {
                total_assets: 12,
                available_now: 8,
                pending_approvals: 3,
                active_events: 1
            },
            notifications: [
                { id: 1, message: "Pemberitahuan: Booking Lab CAD E-31 selesai oleh PTIK.", type: "info" },
                { id: 2, message: "Persetujuan Tertunda: HiAce Sektor Humas untuk KKN Wilayah Temanggung.", type: "warning" }
            ]
        });
    }

    refreshStats() {
        // Mocking remote fetch to Odoo API endpoint
        this.state.liveCounters.available_now = Math.floor(Math.random() * 5) + 5;
    }
}

registry.category("public_widgets").add("campus_booking_monitor", CampusBookingMonitor);
`
  },
  {
    path: "campus_asset_booking/static/src/xml/booking_dashboard_template.xml",
    name: "booking_dashboard_template.xml",
    category: "Static Assets",
    language: "xml",
    description: "XML template parsed by QWeb/Owl framework for UI rendering inside the ERP system.",
    content: `<?xml version="1.0" encoding="UTF-8"?>
<templates xml:space="preserve">
    <t t-name="campus_asset_booking.CampusBookingMonitorTemplate">
        <div class="o_campus_booking_dashboard p-4 bg-light border rounded">
            <div class="row align-items-center mb-4 border-bottom pb-3">
                <div class="col-md-8">
                    <h3 class="text-primary m-0">Live Monitor Realtime Reservasi</h3>
                    <span class="text-muted small">Interaktif Framework Owl Odoo 17 Terintegrasi</span>
                </div>
                <div class="col-md-4 text-end">
                    <button class="btn btn-sm btn-outline-primary" t-on-click="refreshStats">
                        <i class="fa fa-refresh me-1"/> Segarkan Status
                    </button>
                </div>
            </div>

            <!-- Stats grid -->
            <div class="row g-3">
                <div class="col-md-3">
                    <div class="card p-3 bg-white text-dark text-center border">
                        <div class="text-uppercase small text-muted font-weight-bold">Total Aset</div>
                        <h2 class="display-6 font-weight-bold mt-1 text-secondary" t-out="state.liveCounters.total_assets"/>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card p-3 bg-white text-dark text-center border">
                        <div class="text-uppercase small text-muted font-weight-bold">Tersedia</div>
                        <h2 class="display-6 font-weight-bold mt-1 text-success" t-out="state.liveCounters.available_now"/>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card p-3 bg-white text-dark text-center border">
                        <div class="text-uppercase small text-muted font-weight-bold">Approval Pending</div>
                        <h2 class="display-6 font-weight-bold mt-1 text-warning" t-out="state.liveCounters.pending_approvals"/>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card p-3 bg-white text-dark text-center border">
                        <div class="text-uppercase small text-muted font-weight-bold">Aktif Dipakai</div>
                        <h2 class="display-6 font-weight-bold mt-1 text-danger" t-out="state.liveCounters.active_events"/>
                    </div>
                </div>
            </div>
        </div>
    </t>
</templates>
`
  },
  {
    path: "campus_asset_booking/static/css/custom.css",
    name: "custom.css",
    category: "Static Assets",
    language: "css",
    description: "Responsive styling overrides to match Odoo 17 custom enterprise standard.",
    content: `/* Custom style additions for campus asset booking modules */
.o_campus_booking_dashboard {
    background-color: #fafbfc;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.o_campus_booking_dashboard .card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.o_campus_booking_dashboard .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(113, 75, 103, 0.1);
}

.o_campus_booking_dashboard h3 {
    font-weight: 600;
    color: #714B67;
}
`
  },
  {
    path: "campus_asset_booking/i18n/id_ID.po",
    name: "id_ID.po",
    category: "Internationalization",
    language: "po",
    description: "Indonesian language translation mapping file for all models, states, and logs.",
    content: `# Translation of Odoo Server.
# This file contains the translation of the following module:
# \t* campus_asset_booking
#
msgid ""
msgstr ""
"Project-Id-Version: Odoo Server 17.0\\n"
"Report-Msgid-Bugs-To: \\n"
"POT-Creation-Date: 2026-06-06 00:00+0000\\n"
"PO-Revision-Date: 2026-06-06 00:00+0000\\n"
"Last-Translator: Odoo Expert <rendysukirman@gmail.com>\\n"
"Language-Team: Indonesian (https://www.transifex.com/odoo/teams/)\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: \\n"
"Plural-Forms: nplurals=1; plural=0;\\n"

#. module: campus_asset_booking
#: model:ir.model,name:campus_asset_booking.model_campus_asset
msgid "Campus Asset Master Data"
msgstr "Data Induk Aset Kampus"

#. module: campus_asset_booking
#: model:ir.model,name:campus_asset_booking.model_campus_booking
msgid "Campus Asset Booking Record"
msgstr "Catatan Reservasi Aset Kampus"

#. module: campus_asset_booking
#: model:ir.model.fields,field_description:campus_asset_booking.field_campus_asset__name
msgid "Asset Name"
msgstr "Nama Aset"

#. module: campus_asset_booking
#: model:ir.model.fields,field_description:campus_asset_booking.field_campus_booking__state
msgid "Booking Status"
msgstr "Status Reservasi"

#. module: campus_asset_booking
#: code:addons/campus_asset_booking/models/booking.py:0
#, python-format
msgid "Error! Waktu Mulai Peminjaman tidak boleh melampaui Waktu Selesai."
msgstr "Terjadi Kesalahan! Waktu Mulai Peminjaman tidak boleh mendahului atau sama dengan Waktu Selesai."

#. module: campus_asset_booking
#: code:addons/campus_asset_booking/models/booking.py:0
#, python-format
msgid "Konflik Jadwal Deteksi! Aset '%s' sedang dipesan aktif..."
msgstr "Konflik Jadwal Terdeteksi! Aset '%s' sedang digunakan aktif pada rentang waktu yang diajukan."
`
  },
  {
    path: "campus_asset_booking/tests/__init__.py",
    name: "__init__.py",
    category: "Tests",
    language: "python",
    description: "Automated test loaders bundle loader file.",
    content: `# -*- coding: utf-8 -*-

from . import test_booking
`
  },
  {
    path: "campus_asset_booking/tests/test_booking.py",
    name: "test_booking.py",
    category: "Tests",
    language: "python",
    description: "Full Python test case class asserting models and constraint overlap logic in unittest tests.",
    content: `# -*- coding: utf-8 -*-
from odoo.tests.common import TransactionCase
from odoo.exceptions import ValidationError
from datetime import datetime, timedelta

class TestCampusBooking(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super(TestCampusBooking, cls).setUpClass()
        # Create standard test environment
        cls.asset_test = cls.env['campus.asset'].create({
            'name': 'Gedung Lab Uji Coba TI',
            'category': 'building',
            'location': 'Gedung H Lantai 1',
            'capacity': 30,
        })
        cls.user_test = cls.env['res.users'].create({
            'name': 'Budi Santoso',
            'login': 'budi',
            'email': 'budi@campus.example.com',
        })

    def test_01_booking_creation_and_approval(self):
        """Test simple booking request cycle and validation transitions."""
        booking = self.env['campus.booking'].create({
            'asset_id': self.asset_test.id,
            'user_id': self.user_test.id,
            'contact_phone': '081229000100',
            'purpose': 'Rapat Kerja Himpunan Mahasiswa Informatika',
            'date_start': datetime.now() + timedelta(days=1),
            'date_end': datetime.now() + timedelta(days=1, hours=2),
        })
        self.assertEqual(booking.state, 'draft', "Initial booking state must be Draft.")
        
        # Submit booking request
        booking.action_submit_request()
        self.assertEqual(booking.state, 'waiting', "Pending state must be Waiting.")
        
        # Approve booking request
        booking.action_approve()
        self.assertEqual(booking.state, 'approved', "Approved booking state must be Approved.")
        self.assertEqual(booking.asset_id.status, 'booked', "Asset status should be Booked after authorization.")

    def test_02_double_booking_constraint_raises(self):
        """Verify that overlapping bookings of the same asset are blocked by Python API model constraints."""
        start_time = datetime.now() + timedelta(days=2)
        end_time = start_time + timedelta(hours=3)

        # Create first valid booking (approved)
        b1 = self.env['campus.booking'].create({
            'asset_id': self.asset_test.id,
            'user_id': self.user_test.id,
            'contact_phone': '0812000000',
            'purpose': 'Kuliah Tamu Industri Kreatif',
            'date_start': start_time,
            'date_end': end_time,
        })
        b1.action_submit_request()
        b1.action_approve()

        # Create second booking overlapping the first one (Approved state triggers constraint)
        b2 = self.env['campus.booking'].create({
            'asset_id': self.asset_test.id,
            'user_id': self.user_test.id,
            'contact_phone': '08998888',
            'purpose': 'Pekerjaan Kelompok Robotika',
            'date_start': start_time + timedelta(hours=1), # overlopping start
            'date_end': end_time + timedelta(hours=1),
        })

        # Expecting ValidationError when saving or validating constraint
        with self.assertRaises(ValidationError):
            b2.write({'state': 'approved'})
`
  }
];
