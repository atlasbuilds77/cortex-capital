-- Seed: Agent Relationships (15 pairs with initial affinity)
-- Created: Feb 7, 2026

-- High Affinity (Natural Collaborators)
INSERT INTO ops_agent_relationships (agent_a, agent_b, affinity, description) VALUES
    ('atlas', 'sage', 0.80, 'Strategy partners - direct collaboration on risk/reward'),
    ('sage', 'observer', 0.80, 'Process alignment - both focused on rules and protection'),
    ('scout', 'intel', 0.75, 'Data pipeline - execution meets opportunity discovery'),
    ('growth', 'intel', 0.70, 'Research collaboration - analysis meets signal finding');

-- Medium Affinity (Professional)
INSERT INTO ops_agent_relationships (agent_a, agent_b, affinity, description) VALUES
    ('atlas', 'growth', 0.60, 'Performance reviews - strategy meets analysis'),
    ('atlas', 'scout', 0.60, 'Execution coordination - direction meets implementation'),
    ('atlas', 'observer', 0.55, 'Oversight - leadership meets quality control'),
    ('sage', 'growth', 0.55, 'Risk-reward analysis - caution meets optimization'),
    ('sage', 'scout', 0.50, 'Execution precision - risk management meets trade execution'),
    ('scout', 'observer', 0.50, 'Quality checks - execution meets compliance');

-- Low Affinity (Natural Tension - creates healthy debate)
INSERT INTO ops_agent_relationships (agent_a, agent_b, affinity, description) VALUES
    ('atlas', 'intel', 0.35, 'Caution vs aggression - strategy vs opportunity seeking'),
    ('sage', 'intel', 0.30, 'Risk-averse vs opportunity-seeking - protection vs discovery'),
    ('intel', 'observer', 0.40, 'Speed vs quality - fast signals vs careful process'),
    ('growth', 'observer', 0.45, 'Optimization vs compliance - improvement vs rules'),
    ('scout', 'growth', 0.50, 'Executor vs analyst - action vs reflection');

-- Note: All relationships have CHECK constraint ensuring agent_a < agent_b
-- The system automatically orders alphabetically

-- Verify the insertions
SELECT 
    agent_a || ' ↔ ' || agent_b as relationship,
    affinity,
    CASE 
        WHEN affinity >= 0.70 THEN 'High'
        WHEN affinity >= 0.50 THEN 'Medium'
        ELSE 'Low'
    END as affinity_level,
    description
FROM ops_agent_relationships 
ORDER BY affinity DESC, agent_a, agent_b;