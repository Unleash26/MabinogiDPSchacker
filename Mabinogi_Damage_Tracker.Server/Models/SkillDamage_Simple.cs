namespace Mabinogi_Damage_tracker.Models
{
    /// <summary>
    /// プレイヤーごとのスキル別ダメージ情報を格納するモデル
    /// </summary>
    public class SkillDamage_Simple
    {
        public long player_id { get; set; }
        public string player_name { get; set; }
        public int skill_id { get; set; }
        public string skill_name { get; set; }
        public double total_damage { get; set; }

        public SkillDamage_Simple(long playerId, string playerName, int skillId, string skillName, double totalDamage)
        {
            player_id = playerId;
            player_name = playerName;
            skill_id = skillId;
            skill_name = skillName;
            total_damage = totalDamage;
        }
    }
}
