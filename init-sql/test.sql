CREATE Table sample_table (
  timestamp timestamp, 
  word text
);

INSERT INTO sample_table (timestamp ,word) VALUES (now() ,'だいこん');
INSERT INTO sample_table (timestamp ,word) VALUES (now() ,'もちきんちゃく');