using Mabinogi_Damage_Tracker;
using PacketDotNet;
using SharpPcap.LibPcap;
using SharpPcap;
using System.Buffers.Binary;
using System.ComponentModel;
using System.Diagnostics;
using System.Text.RegularExpressions;
using System.Text;
using Microsoft.AspNetCore.Identity.UI.Services;
using System;
using System.Linq.Expressions;
using System.Reflection.Metadata.Ecma335;
using SQLitePCL;



namespace Mabinogi_Damage_tracker
{
    public static class Parser
    {
        static CaptureFileWriterDevice captureFileWriter = new CaptureFileWriterDevice("out.pcapng");
        static bool savenextpacket = false;
        static BindingList<Name> character_names = new BindingList<Name>();
        static UInt64 last_healer = 0;
        public static string adapter_description;
        public static List<string> adapters = new List<string>();


        public static bool pause = false;

        static LibPcapLiveDevice device = null;

        static Thread reader;


        public static bool Stop()
        {
            if (device != null)
            {
                try {
                    device.Close();
                    device.StopCapture();
                    device.OnPacketArrival -= Device_OnPacketArrival;
                } catch {}
            }

            Stopwatch watchdog = Stopwatch.StartNew();
            while (watchdog.ElapsedMilliseconds < 5000 && ((device != null && device.Opened == true) || (reader != null && reader.ThreadState == System.Threading.ThreadState.Running)))
            {
                Thread.Sleep(50);
            }
            if((reader != null && reader.ThreadState == System.Threading.ThreadState.Running) || (device != null && device.Opened == true))
            {
                LogsController.WriteLog("Could not stop thread. Try restarting server");
                return false;
            }
            return true;
        }

        public static void Start()
        {
            reader = new Thread(Reader);
            reader.Name = "Reader Thread";
            reader.Start();
        }

        private static void Reader()
        {
            Debug.WriteLine("starting Parser");
            LogsController.WriteLog("Starting Parser.");

            string filter = "ip and tcp and tcp portrange 11020-11023";

            try 
            {
                adapters = LibPcapLiveDeviceList.Instance.Select(a => a.Description).ToList();
                adapter_description = db_helper.Get_Local_Adapter();
                
                if(adapter_description != null && adapter_description !="")
                {
                    try
                    {
                        device = LibPcapLiveDeviceList.Instance.First(a => a.Description == adapter_description);
                        LogsController.WriteLog(string.Format("Starting with saved adapter: {0}", adapter_description));
                    }
                    catch
                    {
                        device = null;
                    }
                }

                if (adapter_description == null || adapter_description == "" || device == null)
                {
                    foreach (var dev in LibPcapLiveDeviceList.Instance)
                    {
                        Debug.WriteLine(dev.Description.ToString());
                        dev.Open(DeviceModes.Promiscuous, 1000);
                        dev.Filter = filter;

                        Stopwatch watchdog = Stopwatch.StartNew();

                        GetPacketStatus status;
                        PacketCapture pack;
                        while (watchdog.ElapsedMilliseconds < 2000 && device == null)
                        {
                            status = dev.GetNextPacket(out pack);
                            if (status == GetPacketStatus.PacketRead)
                            {
                                adapter_description = dev.Description;
                                Debug.WriteLine("found adapater");
                                LogsController.WriteLog("Found an adapter " + dev.Description);
                                LogsController.WriteLog("Save this adapter's name in the settings menu to skip scanning next time");
                                device = dev;
                                break;
                            }
                        }
                        dev.Close();
                        if (device != null) { break; }
                    }
                }
            }
            catch (Exception ex)
            {
                LogsController.WriteLog("Error scanning adapters: " + ex.Message);
            }

            if (device == null)
            {
                LogsController.WriteLog("Could not find an adapter. Are you sure Mabi is running?");
                LogsController.WriteLog("Restart Parser and try moving while scanning. Check your setup and wireshark to confirm data received.");
                return;
            }

            try
            {
                device.Open(DeviceModes.Promiscuous);
                device.Filter = filter;
                device.OnPacketArrival += Device_OnPacketArrival;
                captureFileWriter.Open();
                
                device.StartCapture();
            }
            catch(Exception ex)
            {
                LogsController.WriteLog("Failed to start parser. execption: " + ex.Message);
            }
        }

        private static void Device_OnPacketArrival(object s, PacketCapture e)
        {
            if(pause == true)
            {
                return;
            }

            DateTime time = e.Header.Timeval.Date;
            int len = e.Data.Length;
            RawCapture raw = e.GetPacket();

            if (savenextpacket)
            {
                savenextpacket = false;
                captureFileWriter.Write(raw);
            }

            Packet packet = PacketDotNet.Packet.ParsePacket(raw.LinkLayerType, raw.Data);

            TcpPacket tcp = packet.Extract<PacketDotNet.TcpPacket>();

            if(tcp == null) { return; }

            int cursor = 0;

            List<healing> healing_packs = new List<healing>();

            while (cursor + 10 < tcp.PayloadData.Length)
            { 
                // サブパケットヘッダを解析
                int begining_of_packet_cursor = cursor;
                byte sign = tcp.PayloadData[cursor];
                cursor += sizeof(byte);

                UInt32 sub_packet_length = BinaryPrimitives.ReadUInt32LittleEndian(tcp.PayloadData.AsSpan(cursor));
                if (sub_packet_length > 2000 || sub_packet_length == 0)
                {
                    // 不正データ、パケットをスキップ
                    continue;
                }
                cursor += sizeof(UInt32);

                byte header_flag = tcp.PayloadData[cursor];
                cursor += sizeof(byte);

                if (sub_packet_length < 5) { cursor = (int)sub_packet_length + begining_of_packet_cursor; continue; }
                if (header_flag > 4 || header_flag == 1 || header_flag == 2) { cursor = (int)sub_packet_length + begining_of_packet_cursor; continue; }

                // ヘッダ完了、次はオペコード
                UInt32 opcode = BinaryPrimitives.ReadUInt32BigEndian(tcp.PayloadData.AsSpan(cursor));
                cursor += sizeof(UInt32);

                switch(opcode)
                {
                    case Op_Codes.healing:
                        pack_healing(tcp, cursor, ref healing_packs, (int)sub_packet_length, begining_of_packet_cursor);
                        break;
                    case Op_Codes.ChatMessage:
                        read_chat(tcp, cursor);
                        break;
                    case Op_Codes.CombatActionPack:
                    case Op_Codes.CombatActionPack2:
                        pack_damage(tcp, cursor, (int)sub_packet_length, begining_of_packet_cursor);
                        break;
                }
                cursor = (int)sub_packet_length + begining_of_packet_cursor; 
                continue; 
            }

            if(healing_packs.Count > 0)
            {
                healing_packs.ForEach(a => a.caster = last_healer);
                foreach (var item in healing_packs)
                {
                    if(item.heal > 10000) { return; }
                    db_helper.add_heal(item.caster, item.recepient, item.heal);
                    LogsController.WriteLog("[HEAL]" + item.caster + "->" + item.recepient + " for " + item.heal);
                    Debug.WriteLine("player {0}, was healed by {1}, for {2}",item.recepient,item.caster,item.heal);
                }
            }

            return;
        }

        private static void pack_healing(TcpPacket tcp, int cursor, ref List<healing> healing_packs, int sub_packet_length, int begining_of_packet_cursor)
        {
            try
            {
                byte heal_type = tcp.PayloadData[cursor + sizeof(UInt64)];
                healing healpack = new healing();

                switch (heal_type)
                {
                    case 0x0A:  // ヒーリング受信
                        healpack.recepient = BinaryPrimitives.ReadUInt64BigEndian(tcp.PayloadData.AsSpan(cursor));
                        healpack.heal = BinaryPrimitives.ReadUInt32BigEndian(tcp.PayloadData.AsSpan(cursor + 17));
                        healing_packs.Add(healpack);
                        break;
                    case 0x19: // ヒーリングキャスト
                        last_healer = BinaryPrimitives.ReadUInt64BigEndian(tcp.PayloadData.AsSpan(cursor));
                        break;
                    case 0x28: // パーティーヒーリング
                        last_healer = BinaryPrimitives.ReadUInt64BigEndian(tcp.PayloadData.AsSpan(cursor));
                        cursor += 19;
                        int stringlength = tcp.PayloadData[cursor];
                        cursor += stringlength;
                        while (cursor < sub_packet_length + begining_of_packet_cursor)
                        {
                            if (tcp.PayloadData[cursor] != 4) { break; }
                            healing multiheal = new healing();
                            multiheal.recepient = BinaryPrimitives.ReadUInt64BigEndian(tcp.PayloadData.AsSpan(cursor + 1));
                            multiheal.caster = last_healer;
                            healing_packs.Add(multiheal);
                            cursor += sizeof(UInt64);
                        }
                        break;
                }
            }
            catch
            {
            }
        }

        private static void pack_damage(TcpPacket tcp, int cursor, int sub_packet_length, int begining_of_packet_cursor)
        {
            UInt32 _subsub_pack_len = 0;

            try
            {
                UInt64 sub_packet_id = BinaryPrimitives.ReadUInt64BigEndian(tcp.PayloadData.AsSpan(cursor));
                cursor += sizeof(UInt64);

                // uvint64 を読み取る
                UInt64 throwaway_uvint64;
                int variable_int_bytesread;
                read_variable_length_uint64(tcp.PayloadData.AsSpan(cursor), out throwaway_uvint64, out variable_int_bytesread);
                cursor += variable_int_bytesread;

                // サブパケットの解析開始
                byte sub_item_count = tcp.PayloadData[cursor];
                cursor += sizeof(byte);

                // 次のバイトは 0 であるべき
                if (tcp.PayloadData[cursor] != 0) { cursor = (int)sub_packet_length + begining_of_packet_cursor; return; }
                cursor++;

                cursor++;
                UInt32 actionpack_id = BinaryPrimitives.ReadUInt32BigEndian(tcp.PayloadData.AsSpan(cursor));
                cursor += sizeof(UInt32);

                cursor++;
                UInt32 prev_actionpack_id = BinaryPrimitives.ReadUInt32BigEndian(tcp.PayloadData.AsSpan(cursor));
                cursor += sizeof(UInt32);

                cursor++;
                byte hit = tcp.PayloadData[cursor];
                cursor += sizeof(byte);

                cursor++;
                byte ttype = tcp.PayloadData[cursor];
                cursor += sizeof(byte);

                cursor++;
                byte unk1 = tcp.PayloadData[cursor];
                cursor += sizeof(byte);

                cursor++;
                byte sub_header_flag = tcp.PayloadData[cursor];
                cursor += sizeof(byte);

                // 攻撃がブロックされたかチェック
                if ((sub_header_flag & 0x1) != 0)
                {
                    cursor++;
                    cursor++;
                    cursor++;
                    cursor += sizeof(UInt32);
                    cursor += sizeof(UInt32);
                    cursor += sizeof(UInt64);
                }

                cursor++;
                UInt32 subsub_packet_count = BinaryPrimitives.ReadUInt32BigEndian(tcp.PayloadData.AsSpan(cursor));
                cursor += sizeof(UInt32);

                UInt64 attacker_id = 0;
                UInt64 enemy_id = 0;
                SkillId skill = 0;
                SkillId subskill = 0;

                // 各サブサブパケットを解析
                for (int i = 0; i < subsub_packet_count; i++)
                {
                    int subsub_pack_start_cursor = cursor + 8;
                    // サブサブパケット長を取得
                    cursor++;
                    UInt32 subsub_pack_len = BinaryPrimitives.ReadUInt32BigEndian(tcp.PayloadData.AsSpan(cursor));
                    _subsub_pack_len = subsub_pack_len;

                    // サブサブパケットのヘッダをスキップ
                    cursor += 22;

                    cursor++;

                    UInt32 combatActionID = BinaryPrimitives.ReadUInt32BigEndian(tcp.PayloadData.AsSpan(cursor));
                    cursor += sizeof(UInt32);

                    cursor++;
                    UInt64 entityID = BinaryPrimitives.ReadUInt64BigEndian(tcp.PayloadData.AsSpan(cursor));
                    cursor += sizeof(UInt64);

                    cursor++;
                    byte subsub_ttype = tcp.PayloadData[cursor];
                    cursor += sizeof(byte);

                    cursor++;
                    UInt16 stun = BinaryPrimitives.ReadUInt16BigEndian(tcp.PayloadData.AsSpan(cursor));
                    cursor += sizeof(UInt16);

                    cursor++;
                    UInt16 skillid = BinaryPrimitives.ReadUInt16BigEndian(tcp.PayloadData.AsSpan(cursor));
                    cursor += sizeof(UInt16);

                    cursor++;
                    UInt16 subskillid = BinaryPrimitives.ReadUInt16BigEndian(tcp.PayloadData.AsSpan(cursor));
                    cursor += sizeof(UInt16);

                    cursor++;
                    UInt16 subsub_unk1 = BinaryPrimitives.ReadUInt16BigEndian(tcp.PayloadData.AsSpan(cursor));
                    cursor += sizeof(UInt16);


                    if ((subsub_ttype & 2) != 0)
                    {
                        attacker_id = entityID;
                        skill = (SkillId)skillid;
                        subskill = (SkillId)subskillid;
                    }

                    if ((subsub_ttype & 1) != 0)
                    {
                        enemy_id = entityID;
                        cursor++;
                        UInt32 options = BinaryPrimitives.ReadUInt32BigEndian(tcp.PayloadData.AsSpan(cursor));
                        cursor += sizeof(UInt32);

                        cursor++;
                        float damage = BinaryPrimitives.ReadSingleLittleEndian(tcp.PayloadData.AsSpan(cursor));
                        cursor += sizeof(float);

                        cursor++;
                        float wound = BinaryPrimitives.ReadSingleLittleEndian(tcp.PayloadData.AsSpan(cursor));
                        cursor += sizeof(float);

                        cursor++;
                        UInt32 manaDamage = BinaryPrimitives.ReadUInt32BigEndian(tcp.PayloadData.AsSpan(cursor));
                        cursor += sizeof(UInt32);

                        // プレイヤーの攻撃ダメージのみ記録
                        if (attacker_id < 0x0010000000000001 || attacker_id > 0x0010010000000001)
                        { break; }

                        if(damage < 0 || damage > 100000000 || skillid == 601 || skillid == 512 || skillid == 590) { break; }

                        LogsController.WriteLog(string.Format("[DAMAGE] Attacker: {0} -> Enemy: {1} for {2}", attacker_id, enemy_id, damage));
                        Debug.WriteLine("Damage {0}, Wound {1}, mana Damage {2}, Attacker {3} {4} -> Enemy {5}, with {6} : {7}", damage.ToString("0.0"), wound.ToString("0.0"), manaDamage, attacker_id, "", enemy_id, skill, subskill);
                        db_helper.add_damage((Int64)attacker_id, damage, wound, (int)manaDamage, (Int64)enemy_id, (int)skill, (int)subskill);
                    }
                    cursor = subsub_pack_start_cursor + (int)subsub_pack_len;
                }
            }
            catch (ArgumentOutOfRangeException ex)
            {
                Debug.WriteLine("Cursor out of range, saving this packet and the next. cursor at {0}, packet length {1}, sub packet length {2}, sub sub packet length {3}", cursor, tcp.PayloadData.Length, sub_packet_length, _subsub_pack_len);
                cursor = (int)sub_packet_length + begining_of_packet_cursor;
                savenextpacket = true;
            }
            catch (Exception ex)
            {
                cursor = (int)sub_packet_length + begining_of_packet_cursor;
                Debug.WriteLine("caught an execption after finding a damage packet: ex {0}", ex.ToString());
            }
        }

        private static void read_chat(TcpPacket packet, int cursor)
        {
            try
            {
                UInt64 playerid = BinaryPrimitives.ReadUInt64BigEndian(packet.PayloadData.AsSpan(cursor));

                if (playerid < 0x0010000000000001 || playerid > 0x0010010000000001)
                {
                    return;
                }

                if (character_names.Select(a => a.player_id).Contains(playerid))
                {
                    return;
                }

                cursor = 25;
                byte namelength = packet.PayloadData[25];

                if (namelength > 36 || namelength <= 1) { return; }
                cursor++;

                string playername = Encoding.UTF8.GetString(packet.PayloadData, cursor, (int)namelength - 1);

                db_helper.add_player(playername, (Int64)playerid);
                LogsController.WriteLog("[PLAYER DISCOVERED]" + playerid.ToString() + " -> " + playername);
                Debug.WriteLine("chat message read, playerid: {0}, username {1}", playerid.ToString(), playername);
            }
            catch
            {
            }
        }

        private static void read_variable_length_uint64(Span<byte> bytes, out UInt64 parsedint, out int bytesread)
        {
            bytesread = 0;
            parsedint = 0;
            foreach (byte b in bytes)
            {
                if (bytesread == 10)
                {
                    parsedint = 0;
                    bytesread = -1;
                    return;
                }
                if (b < 0x80)
                {
                    if (b > 1 && bytesread == 9)
                    {
                        parsedint = 0;
                        bytesread = -1;
                        return;
                    }
                    parsedint = parsedint | (UInt64)b << bytesread * 8;
                    bytesread += 1;
                    return;
                }
                parsedint |= (UInt64)(b & 127) << (bytesread * 8) - bytesread;
                bytesread += 1;
            }
            parsedint = 0;
            bytesread = -1;
            return;
        }

    }
}